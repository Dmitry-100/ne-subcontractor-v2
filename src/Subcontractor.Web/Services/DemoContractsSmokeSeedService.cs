using System.Globalization;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Application.Projects;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Web.Configuration;

namespace Subcontractor.Web.Services;

public sealed class DemoContractsSmokeSeedService : IDemoContractsSmokeSeedService
{
    private static readonly SemaphoreSlim SeedLock = new(1, 1);

    private readonly IProjectsService _projectsService;
    private readonly ILotsService _lotsService;
    private readonly IProcurementProceduresService _procurementProceduresService;
    private readonly IContractorsService _contractorsService;
    private readonly IContractsService _contractsService;
    private readonly IOptions<DemoSeedOptions> _options;
    private readonly ILogger<DemoContractsSmokeSeedService> _logger;

    public DemoContractsSmokeSeedService(
        IProjectsService projectsService,
        ILotsService lotsService,
        IProcurementProceduresService procurementProceduresService,
        IContractorsService contractorsService,
        IContractsService contractsService,
        IOptions<DemoSeedOptions> options,
        ILogger<DemoContractsSmokeSeedService> logger)
    {
        _projectsService = projectsService;
        _lotsService = lotsService;
        _procurementProceduresService = procurementProceduresService;
        _contractorsService = contractorsService;
        _contractsService = contractsService;
        _options = options;
        _logger = logger;
    }

    public async Task<DemoContractsSmokeSeedResult> EnsureContractsSmokeSeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedLock.WaitAsync(cancellationToken);
        try
        {
            var prefix = NormalizePrefix(_options.Value.ContractsPrefix);
            var existingContracts = await _contractsService.ListAsync(
                search: prefix,
                status: null,
                lotId: null,
                procedureId: null,
                contractorId: null,
                cancellationToken: cancellationToken);

            if (existingContracts.Count > 0)
            {
                return new DemoContractsSmokeSeedResult(
                    Created: false,
                    ContractsWithPrefix: existingContracts.Count,
                    ContractNumberPrefix: prefix,
                    CreatedContractNumber: null);
            }

            var token = DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmssfff", CultureInfo.InvariantCulture);
            var shortToken = token.Length > 8 ? token[^8..] : token;

            var project = await _projectsService.CreateAsync(new CreateProjectRequest
            {
                Code = $"SMK-PRJ-{shortToken}",
                Name = $"Smoke Project {shortToken}"
            }, cancellationToken);

            var lot = await _lotsService.CreateAsync(new CreateLotRequest
            {
                Code = $"SMK-LOT-{shortToken}",
                Name = $"Smoke Lot {shortToken}",
                Items =
                [
                    new UpsertLotItemRequest
                    {
                        ProjectId = project.Id,
                        ObjectWbs = "SMK.001",
                        DisciplineCode = "PIPING",
                        ManHours = 120m
                    }
                ]
            }, cancellationToken);

            await _lotsService.TransitionAsync(
                lot.Id,
                new LotStatusTransitionRequest
                {
                    TargetStatus = LotStatus.InProcurement
                },
                cancellationToken);

            var procedure = await _procurementProceduresService.CreateAsync(new CreateProcedureRequest
            {
                LotId = lot.Id,
                PurchaseTypeCode = "SMOKE",
                ObjectName = $"Smoke Object {shortToken}",
                WorkScope = "Smoke Work Scope",
                CustomerName = "Smoke Customer",
                LeadOfficeCode = "SMK",
                AnalyticsLevel1Code = "L1",
                AnalyticsLevel2Code = "L2",
                AnalyticsLevel3Code = "L3",
                AnalyticsLevel4Code = "L4",
                AnalyticsLevel5Code = "L5",
                ApprovalMode = ProcedureApprovalMode.External,
                ContainsConfidentialInfo = false,
                RequiresTechnicalNegotiations = false
            }, cancellationToken);

            await TransitionProcedureForwardAsync(procedure.Id, cancellationToken);

            var contractor = await _contractorsService.CreateAsync(new CreateContractorRequest
            {
                Inn = BuildInn(token),
                Name = $"Smoke Contractor {shortToken}",
                City = "Москва",
                ContactName = "Smoke User",
                Phone = "+70000000000",
                Email = $"smoke-{shortToken.ToLowerInvariant()}@test.local",
                CapacityHours = 160m,
                CurrentRating = 1.0m,
                CurrentLoadPercent = 0m,
                ReliabilityClass = ReliabilityClass.New,
                Status = ContractorStatus.Active,
                DisciplineCodes = ["PIPING"]
            }, cancellationToken);

            var contractNumber = $"{prefix}-{shortToken}";
            await _contractsService.CreateAsync(new CreateContractRequest
            {
                LotId = lot.Id,
                ProcedureId = procedure.Id,
                ContractorId = contractor.Id,
                ContractNumber = contractNumber,
                AmountWithoutVat = 1000m,
                VatAmount = 200m,
                TotalAmount = 1200m,
                Status = ContractStatus.Draft
            }, cancellationToken);

            var reloadedContracts = await _contractsService.ListAsync(
                search: prefix,
                status: null,
                lotId: null,
                procedureId: null,
                contractorId: null,
                cancellationToken: cancellationToken);

            _logger.LogInformation(
                "Demo smoke seed completed. Prefix: {Prefix}, ContractsWithPrefix: {ContractsCount}.",
                prefix,
                reloadedContracts.Count);

            return new DemoContractsSmokeSeedResult(
                Created: true,
                ContractsWithPrefix: reloadedContracts.Count,
                ContractNumberPrefix: prefix,
                CreatedContractNumber: contractNumber);
        }
        finally
        {
            SeedLock.Release();
        }
    }

    private async Task TransitionProcedureForwardAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        var statuses = new[]
        {
            ProcurementProcedureStatus.DocumentsPreparation,
            ProcurementProcedureStatus.OnApproval,
            ProcurementProcedureStatus.Sent,
            ProcurementProcedureStatus.OffersReceived,
            ProcurementProcedureStatus.DecisionMade
        };

        foreach (var status in statuses)
        {
            await _procurementProceduresService.TransitionAsync(
                procedureId,
                new ProcedureStatusTransitionRequest
                {
                    TargetStatus = status
                },
                cancellationToken);
        }
    }

    private static string NormalizePrefix(string? configuredPrefix)
    {
        return string.IsNullOrWhiteSpace(configuredPrefix)
            ? "SMOKE-READONLY"
            : configuredPrefix.Trim();
    }

    private static string BuildInn(string token)
    {
        var digits = new string(token.Where(char.IsDigit).ToArray());
        if (digits.Length < 8)
        {
            digits = digits.PadLeft(8, '0');
        }
        else if (digits.Length > 8)
        {
            digits = digits[^8..];
        }

        return $"77{digits}";
    }
}
