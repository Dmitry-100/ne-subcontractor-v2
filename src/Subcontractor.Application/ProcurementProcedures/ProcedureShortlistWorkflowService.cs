using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

public sealed class ProcedureShortlistWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ProcedureShortlistWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProcedureShortlistItemDto>> GetShortlistAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        return await _dbContext.ProcedureShortlistItems
            .AsNoTracking()
            .Include(x => x.Contractor)
            .Where(x => x.ProcedureId == procedureId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Contractor.Name)
            .Select(x => new ProcedureShortlistItemDto(
                x.Id,
                x.ContractorId,
                x.Contractor.Name,
                x.IsIncluded,
                x.SortOrder,
                x.ExclusionReason,
                x.Notes))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureShortlistItemDto>> UpsertShortlistAsync(
        Guid procedureId,
        UpdateProcedureShortlistRequest request,
        CancellationToken cancellationToken = default)
    {
        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.Status is ProcurementProcedureStatus.Canceled or ProcurementProcedureStatus.Completed)
        {
            throw new InvalidOperationException("Shortlist cannot be edited for completed or canceled procedures.");
        }

        var normalizedItems = ProcedureShortlistMutationPolicy.NormalizeItems(request.Items);
        var contractorIds = normalizedItems.Select(x => x.ContractorId).ToArray();
        if (contractorIds.Length > 0)
        {
            var contractorMap = await _dbContext.Set<Contractor>()
                .AsNoTracking()
                .Where(x => contractorIds.Contains(x.Id) && x.Status == ContractorStatus.Active)
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);

            if (contractorMap.Count != contractorIds.Length)
            {
                var missing = contractorIds.Where(id => contractorMap.All(x => x != id)).ToArray();
                throw new ArgumentException($"Unknown or inactive contractors in shortlist: {string.Join(", ", missing)}");
            }
        }

        var existingItems = await _dbContext.Set<ProcedureShortlistItem>()
            .Where(x => x.ProcedureId == procedureId)
            .ToListAsync(cancellationToken);

        var adjustmentLogs = ProcedureShortlistMutationPolicy.BuildAdjustmentLogs(
            procedureId,
            existingItems,
            normalizedItems,
            request.AdjustmentReason);

        if (existingItems.Count > 0)
        {
            _dbContext.Set<ProcedureShortlistItem>().RemoveRange(existingItems);
        }

        if (adjustmentLogs.Count > 0)
        {
            await _dbContext.Set<ProcedureShortlistAdjustmentLog>().AddRangeAsync(adjustmentLogs, cancellationToken);
        }

        foreach (var item in normalizedItems)
        {
            await _dbContext.Set<ProcedureShortlistItem>().AddAsync(new ProcedureShortlistItem
            {
                ProcedureId = procedureId,
                ContractorId = item.ContractorId,
                IsIncluded = item.IsIncluded,
                SortOrder = item.SortOrder,
                ExclusionReason = item.ExclusionReason,
                Notes = item.Notes
            }, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetShortlistAsync(procedureId, cancellationToken);
    }

    private async Task<ProcurementProcedure> EnsureProcedureExistsAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == procedureId, cancellationToken);

        return procedure ?? throw new KeyNotFoundException($"Procedure '{procedureId}' not found.");
    }
}
