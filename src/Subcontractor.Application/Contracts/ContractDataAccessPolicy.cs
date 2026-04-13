using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contracts.Models;

namespace Subcontractor.Application.Contracts;

internal static class ContractDataAccessPolicy
{
    public static async Task EnsureProcedureContractAvailableAsync(
        IApplicationDbContext dbContext,
        Guid procedureId,
        Guid? excludedContractId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Contracts.Where(x => x.ProcedureId == procedureId);
        if (excludedContractId.HasValue)
        {
            query = query.Where(x => x.Id != excludedContractId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new InvalidOperationException("Contract for this procedure already exists.");
        }
    }

    public static async Task EnsureContractNumberAvailableAsync(
        IApplicationDbContext dbContext,
        string contractNumber,
        Guid? excludedContractId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Contracts.Where(x => x.ContractNumber == contractNumber);
        if (excludedContractId.HasValue)
        {
            query = query.Where(x => x.Id != excludedContractId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new InvalidOperationException($"Contract number '{contractNumber}' is already used.");
        }
    }

    public static async Task EnsureContractExistsAsync(
        IApplicationDbContext dbContext,
        Guid contractId,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.Contracts
            .AsNoTracking()
            .AnyAsync(x => x.Id == contractId, cancellationToken);

        if (!exists)
        {
            throw new KeyNotFoundException($"Contract '{contractId}' was not found.");
        }
    }

    public static async Task EnsureNoOverdueMilestonesBeforeCloseAsync(
        IApplicationDbContext dbContext,
        Guid contractId,
        CancellationToken cancellationToken)
    {
        var utcToday = DateTime.UtcNow.Date;
        var hasOverdue = await dbContext.ContractMilestones
            .AsNoTracking()
            .AnyAsync(
                x => x.ContractId == contractId &&
                     x.ProgressPercent < 100m &&
                     x.PlannedDate < utcToday,
                cancellationToken);

        if (hasOverdue)
        {
            throw new InvalidOperationException("Contract has overdue milestones. Resolve overdue items before closing.");
        }
    }

    public static async Task<ContractExecutionSummaryDto> BuildExecutionSummaryAsync(
        IApplicationDbContext dbContext,
        Guid contractId,
        CancellationToken cancellationToken)
    {
        var utcToday = DateTime.UtcNow.Date;
        var milestones = await dbContext.ContractMilestones
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);

        return ContractExecutionSummaryPolicy.BuildSummary(contractId, milestones, utcToday);
    }

    public static async Task<string> GenerateDraftContractNumberAsync(
        IApplicationDbContext dbContext,
        Guid procedureId,
        CancellationToken cancellationToken)
    {
        var baseNumber = $"DRAFT-{DateTime.UtcNow:yyyyMMdd}-{procedureId.ToString()[..8].ToUpperInvariant()}";
        var candidate = baseNumber;
        var counter = 1;

        while (await dbContext.Contracts.AnyAsync(x => x.ContractNumber == candidate, cancellationToken))
        {
            candidate = $"{baseNumber}-{counter}";
            counter++;
        }

        return candidate;
    }

    public static async Task<Dictionary<Guid, string>> ResolveContractorNamesAsync(
        IApplicationDbContext dbContext,
        IReadOnlyCollection<Guid> contractorIds,
        CancellationToken cancellationToken)
    {
        if (contractorIds.Count == 0)
        {
            return [];
        }

        return await dbContext.Contractors
            .AsNoTracking()
            .Where(x => contractorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
    }

    public static async Task<string?> ResolveContractorNameAsync(
        IApplicationDbContext dbContext,
        Guid contractorId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Contractors
            .AsNoTracking()
            .Where(x => x.Id == contractorId)
            .Select(x => x.Name)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
