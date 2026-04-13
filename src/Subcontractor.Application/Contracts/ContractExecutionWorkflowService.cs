using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

internal sealed class ContractExecutionWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ContractReadQueryService _readQueryService;

    public ContractExecutionWorkflowService(
        IApplicationDbContext dbContext,
        ContractReadQueryService readQueryService)
    {
        _dbContext = dbContext;
        _readQueryService = readQueryService;
    }

    public async Task<IReadOnlyList<ContractMilestoneDto>> UpsertMilestonesAsync(
        Guid contractId,
        UpdateContractMilestonesRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureEditableContractAsync(
            contractId,
            "Milestones can be edited only for Signed or Active contracts.",
            cancellationToken);

        var normalizedItems = ContractMilestoneNormalizationPolicy.NormalizeMilestoneItems(request.Items);
        var existingMilestones = await _dbContext.Set<ContractMilestone>()
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);
        if (existingMilestones.Count > 0)
        {
            _dbContext.Set<ContractMilestone>().RemoveRange(existingMilestones);
        }

        foreach (var item in normalizedItems)
        {
            await _dbContext.Set<ContractMilestone>().AddAsync(new ContractMilestone
            {
                ContractId = contractId,
                Title = item.Title,
                PlannedDate = item.PlannedDate,
                ActualDate = item.ActualDate,
                ProgressPercent = item.ProgressPercent,
                SortOrder = item.SortOrder,
                Notes = item.Notes
            }, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await _readQueryService.GetMilestonesAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMonitoringControlPointDto>> UpsertMonitoringControlPointsAsync(
        Guid contractId,
        UpdateContractMonitoringControlPointsRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureEditableContractAsync(
            contractId,
            "Monitoring control points can be edited only for Signed or Active contracts.",
            cancellationToken);

        var normalizedItems = ContractMonitoringControlPointNormalizationPolicy.NormalizeControlPointItems(request.Items);
        var existingControlPoints = await _dbContext.Set<ContractMonitoringControlPoint>()
            .Include(x => x.Stages)
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);
        if (existingControlPoints.Count > 0)
        {
            _dbContext.Set<ContractMonitoringControlPointStage>().RemoveRange(existingControlPoints.SelectMany(x => x.Stages));
            _dbContext.Set<ContractMonitoringControlPoint>().RemoveRange(existingControlPoints);
        }

        foreach (var item in normalizedItems)
        {
            var controlPoint = new ContractMonitoringControlPoint
            {
                ContractId = contractId,
                Name = item.Name,
                ResponsibleRole = item.ResponsibleRole,
                PlannedDate = item.PlannedDate,
                ForecastDate = item.ForecastDate,
                ActualDate = item.ActualDate,
                ProgressPercent = item.ProgressPercent,
                SortOrder = item.SortOrder,
                Notes = item.Notes
            };

            foreach (var stage in item.Stages)
            {
                controlPoint.Stages.Add(new ContractMonitoringControlPointStage
                {
                    Name = stage.Name,
                    PlannedDate = stage.PlannedDate,
                    ForecastDate = stage.ForecastDate,
                    ActualDate = stage.ActualDate,
                    ProgressPercent = stage.ProgressPercent,
                    SortOrder = stage.SortOrder,
                    Notes = stage.Notes
                });
            }

            await _dbContext.Set<ContractMonitoringControlPoint>().AddAsync(controlPoint, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await _readQueryService.GetMonitoringControlPointsAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMdrCardDto>> UpsertMdrCardsAsync(
        Guid contractId,
        UpdateContractMdrCardsRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureEditableContractAsync(
            contractId,
            "MDR cards can be edited only for Signed or Active contracts.",
            cancellationToken);

        var normalizedItems = ContractMdrNormalizationPolicy.NormalizeMdrCardItems(request.Items);
        var existingCards = await _dbContext.Set<ContractMdrCard>()
            .Include(x => x.Rows)
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);
        if (existingCards.Count > 0)
        {
            _dbContext.Set<ContractMdrRow>().RemoveRange(existingCards.SelectMany(x => x.Rows));
            _dbContext.Set<ContractMdrCard>().RemoveRange(existingCards);
        }

        foreach (var item in normalizedItems)
        {
            var card = new ContractMdrCard
            {
                ContractId = contractId,
                Title = item.Title,
                ReportingDate = item.ReportingDate,
                SortOrder = item.SortOrder,
                Notes = item.Notes
            };

            foreach (var row in item.Rows)
            {
                card.Rows.Add(new ContractMdrRow
                {
                    RowCode = row.RowCode,
                    Description = row.Description,
                    UnitCode = row.UnitCode,
                    PlanValue = row.PlanValue,
                    ForecastValue = row.ForecastValue,
                    FactValue = row.FactValue,
                    SortOrder = row.SortOrder,
                    Notes = row.Notes
                });
            }

            await _dbContext.Set<ContractMdrCard>().AddAsync(card, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await _readQueryService.GetMdrCardsAsync(contractId, cancellationToken);
    }

    public async Task<ImportContractMdrForecastFactResultDto> ImportMdrForecastFactAsync(
        Guid contractId,
        ImportContractMdrForecastFactRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureEditableContractAsync(
            contractId,
            "MDR cards can be edited only for Signed or Active contracts.",
            cancellationToken);

        var normalizedItems = ContractMdrNormalizationPolicy.NormalizeMdrForecastFactImportItems(request.Items);
        var cards = await _dbContext.Set<ContractMdrCard>()
            .Include(x => x.Rows)
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);

        var rowIndex = ContractMdrNormalizationPolicy.BuildImportRowIndex(cards, out var ambiguousKeys);
        var resolution = ContractMdrImportResolutionPolicy.Resolve(normalizedItems, rowIndex, ambiguousKeys);

        var applyChanges = resolution.Conflicts.Count == 0 || request.SkipConflicts;
        var updatedRows = 0;
        if (applyChanges)
        {
            updatedRows = ContractMdrImportResolutionPolicy.ApplyUpdates(resolution.Updates);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var resultCards = await _readQueryService.GetMdrCardsAsync(contractId, cancellationToken);
        return new ImportContractMdrForecastFactResultDto(
            applyChanges,
            normalizedItems.Length,
            updatedRows,
            resolution.Conflicts.Count,
            resolution.Conflicts,
            resultCards);
    }

    private async Task EnsureEditableContractAsync(
        Guid contractId,
        string readOnlyMessage,
        CancellationToken cancellationToken)
    {
        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == contractId, cancellationToken);
        if (contract is null)
        {
            throw new KeyNotFoundException($"Contract '{contractId}' was not found.");
        }

        if (contract.Status is not (ContractStatus.Signed or ContractStatus.Active))
        {
            throw new InvalidOperationException(readOnlyMessage);
        }
    }
}
