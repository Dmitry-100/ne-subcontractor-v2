using Subcontractor.Application.Projects;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Exports.Models;
using Subcontractor.Application.Lots;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Exports;

public sealed class RegistryExportService : IRegistryExportService
{
    private readonly IProjectsService _projectsService;
    private readonly IContractorsService _contractorsService;
    private readonly ILotsService _lotsService;
    private readonly IProcurementProceduresService _proceduresService;
    private readonly IContractsService _contractsService;

    public RegistryExportService(
        IProjectsService projectsService,
        IContractorsService contractorsService,
        ILotsService lotsService,
        IProcurementProceduresService proceduresService,
        IContractsService contractsService)
    {
        _projectsService = projectsService;
        _contractorsService = contractorsService;
        _lotsService = lotsService;
        _proceduresService = proceduresService;
        _contractsService = contractsService;
    }

    public async Task<RegistryExportFileDto> ExportProjectsAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var rows = await _projectsService.ListAsync(search, cancellationToken);

        return RegistryExportCsvPolicy.BuildCsv(
            "projects",
            ["Id", "Code", "Name", "GipUserId"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.Code,
                x.Name,
                RegistryExportCsvPolicy.FormatGuid(x.GipUserId)
            }));
    }

    public async Task<RegistryExportFileDto> ExportContractorsAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var rows = await _contractorsService.ListAsync(search, cancellationToken);

        return RegistryExportCsvPolicy.BuildCsv(
            "contractors",
            ["Id", "Inn", "Name", "City", "Status", "ReliabilityClass", "CurrentRating", "CurrentLoadPercent"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.Inn,
                x.Name,
                x.City,
                x.Status.ToString(),
                x.ReliabilityClass.ToString(),
                RegistryExportCsvPolicy.FormatDecimal(x.CurrentRating),
                RegistryExportCsvPolicy.FormatDecimal(x.CurrentLoadPercent)
            }));
    }

    public async Task<RegistryExportFileDto> ExportLotsAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _lotsService.ListAsync(search, status, projectId, cancellationToken);

        return RegistryExportCsvPolicy.BuildCsv(
            "lots",
            ["Id", "Code", "Name", "Status", "ResponsibleCommercialUserId", "ItemsCount", "TotalManHours"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.Code,
                x.Name,
                x.Status.ToString(),
                RegistryExportCsvPolicy.FormatGuid(x.ResponsibleCommercialUserId),
                x.ItemsCount.ToString(System.Globalization.CultureInfo.InvariantCulture),
                RegistryExportCsvPolicy.FormatDecimal(x.TotalManHours)
            }));
    }

    public async Task<RegistryExportFileDto> ExportProceduresAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _proceduresService.ListAsync(search, status, lotId, cancellationToken);

        return RegistryExportCsvPolicy.BuildCsv(
            "procedures",
            ["Id", "LotId", "Status", "PurchaseTypeCode", "ObjectName", "InitiatorUserId", "ResponsibleCommercialUserId", "RequiredSubcontractorDeadline", "ApprovalMode"],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.LotId.ToString(),
                x.Status.ToString(),
                x.PurchaseTypeCode,
                x.ObjectName,
                RegistryExportCsvPolicy.FormatGuid(x.InitiatorUserId),
                RegistryExportCsvPolicy.FormatGuid(x.ResponsibleCommercialUserId),
                RegistryExportCsvPolicy.FormatDate(x.RequiredSubcontractorDeadline),
                x.ApprovalMode.ToString()
            }));
    }

    public async Task<RegistryExportFileDto> ExportContractsAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _contractsService.ListAsync(
            search,
            status,
            lotId,
            procedureId,
            contractorId,
            cancellationToken);

        return RegistryExportCsvPolicy.BuildCsv(
            "contracts",
            [
                "Id",
                "ContractNumber",
                "LotId",
                "ProcedureId",
                "ContractorId",
                "ContractorName",
                "Status",
                "SigningDate",
                "AmountWithoutVat",
                "VatAmount",
                "TotalAmount",
                "StartDate",
                "EndDate"
            ],
            rows.Select(x => new[]
            {
                x.Id.ToString(),
                x.ContractNumber,
                x.LotId.ToString(),
                x.ProcedureId.ToString(),
                x.ContractorId.ToString(),
                x.ContractorName ?? string.Empty,
                x.Status.ToString(),
                RegistryExportCsvPolicy.FormatDate(x.SigningDate),
                RegistryExportCsvPolicy.FormatDecimal(x.AmountWithoutVat),
                RegistryExportCsvPolicy.FormatDecimal(x.VatAmount),
                RegistryExportCsvPolicy.FormatDecimal(x.TotalAmount),
                RegistryExportCsvPolicy.FormatDate(x.StartDate),
                RegistryExportCsvPolicy.FormatDate(x.EndDate)
            }));
    }
}
