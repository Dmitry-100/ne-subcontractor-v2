using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Projects;

namespace Subcontractor.Application.Dashboard;

public sealed class DashboardCountersAndStatusesQueryService
{
    private static readonly Func<DbContext, Task<int>> CompiledProjectsTotalCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<Project>()
                    .AsNoTracking()
                    .Count());

    private static readonly Func<DbContext, Guid, Task<int>> CompiledProjectsScopedCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext, Guid appUserId) =>
                dbContext.Set<Project>()
                    .AsNoTracking()
                    .Count(x => x.GipUserId == appUserId));

    private static readonly Func<DbContext, IAsyncEnumerable<LotStatusCountRow>> CompiledLotStatusCountsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<Lot>()
                    .AsNoTracking()
                    .GroupBy(x => x.Status)
                    .Select(x => new LotStatusCountRow(x.Key, x.Count())));

    private static readonly Func<DbContext, IAsyncEnumerable<ProcedureStatusCountRow>> CompiledProcedureStatusCountsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<ProcurementProcedure>()
                    .AsNoTracking()
                    .GroupBy(x => x.Status)
                    .Select(x => new ProcedureStatusCountRow(x.Key, x.Count())));

    private static readonly Func<DbContext, IAsyncEnumerable<ContractStatusCountRow>> CompiledContractStatusCountsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<Contract>()
                    .AsNoTracking()
                    .GroupBy(x => x.Status)
                    .Select(x => new ContractStatusCountRow(x.Key, x.Count())));

    private readonly IApplicationDbContext _dbContext;

    public DashboardCountersAndStatusesQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DashboardCountersAndStatusesQueryResult> BuildAsync(
        DashboardUserContext userContext,
        bool canReadProjects,
        bool canReadLots,
        bool canReadProcedures,
        bool canReadContracts,
        CancellationToken cancellationToken = default)
    {
        var lotStatusCounts = canReadLots
            ? await LoadLotStatusCountsAsync(cancellationToken)
            : null;
        var procedureStatusCounts = canReadProcedures
            ? await LoadProcedureStatusCountsAsync(cancellationToken)
            : null;
        var contractStatusCounts = canReadContracts
            ? await LoadContractStatusCountsAsync(cancellationToken)
            : null;

        var projectsTotal = canReadProjects
            ? await CountProjectsAsync(userContext, cancellationToken)
            : 0;
        var lotsTotal = lotStatusCounts is not null
            ? lotStatusCounts.Values.Sum()
            : 0;
        var proceduresTotal = procedureStatusCounts is not null
            ? procedureStatusCounts.Values.Sum()
            : 0;
        var contractsTotal = contractStatusCounts is not null
            ? contractStatusCounts.Values.Sum()
            : 0;

        var lotStatuses = lotStatusCounts is not null
            ? ToStatusList(lotStatusCounts, Enum.GetValues<LotStatus>())
            : [];
        var procedureStatuses = procedureStatusCounts is not null
            ? ToStatusList(procedureStatusCounts, Enum.GetValues<ProcurementProcedureStatus>())
            : [];
        var contractStatuses = contractStatusCounts is not null
            ? ToStatusList(contractStatusCounts, Enum.GetValues<ContractStatus>())
            : [];

        return new DashboardCountersAndStatusesQueryResult(
            new DashboardCountersDto(projectsTotal, lotsTotal, proceduresTotal, contractsTotal),
            lotStatuses,
            procedureStatuses,
            contractStatuses,
            lotStatusCounts,
            procedureStatusCounts,
            contractStatusCounts);
    }

    private async Task<int> CountProjectsAsync(DashboardUserContext userContext, CancellationToken cancellationToken)
    {
        if (_dbContext is DbContext efDbContext)
        {
            return userContext.HasProjectsGlobalRead
                ? await CompiledProjectsTotalCountQuery(efDbContext).WaitAsync(cancellationToken)
                : await CompiledProjectsScopedCountQuery(efDbContext, userContext.AppUserId).WaitAsync(cancellationToken);
        }

        var query = _dbContext.Projects.AsNoTracking();
        query = ApplyProjectScope(query, userContext);
        return await query.CountAsync(cancellationToken);
    }

    private static IQueryable<Project> ApplyProjectScope(IQueryable<Project> query, DashboardUserContext userContext)
    {
        if (userContext.HasProjectsGlobalRead)
        {
            return query;
        }

        return query.Where(x => x.GipUserId == userContext.AppUserId);
    }

    private async Task<Dictionary<LotStatus, int>> LoadLotStatusCountsAsync(CancellationToken cancellationToken)
    {
        if (_dbContext is DbContext efDbContext)
        {
            return await ToDictionaryAsync(
                CompiledLotStatusCountsQuery(efDbContext),
                item => item.Status,
                item => item.Count,
                cancellationToken);
        }

        return await _dbContext.Lots
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    private async Task<Dictionary<ProcurementProcedureStatus, int>> LoadProcedureStatusCountsAsync(
        CancellationToken cancellationToken)
    {
        if (_dbContext is DbContext efDbContext)
        {
            return await ToDictionaryAsync(
                CompiledProcedureStatusCountsQuery(efDbContext),
                item => item.Status,
                item => item.Count,
                cancellationToken);
        }

        return await _dbContext.Procedures
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    private async Task<Dictionary<ContractStatus, int>> LoadContractStatusCountsAsync(CancellationToken cancellationToken)
    {
        if (_dbContext is DbContext efDbContext)
        {
            return await ToDictionaryAsync(
                CompiledContractStatusCountsQuery(efDbContext),
                item => item.Status,
                item => item.Count,
                cancellationToken);
        }

        return await _dbContext.Contracts
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    private static IReadOnlyList<DashboardStatusCountDto> ToStatusList<TStatus>(
        IReadOnlyDictionary<TStatus, int> counts,
        TStatus[] statuses)
        where TStatus : struct, Enum
    {
        return statuses
            .Select(status => new DashboardStatusCountDto(
                status.ToString(),
                counts.TryGetValue(status, out var count) ? count : 0))
            .ToArray();
    }

    private static async Task<Dictionary<TKey, int>> ToDictionaryAsync<TKey, TItem>(
        IAsyncEnumerable<TItem> source,
        Func<TItem, TKey> keySelector,
        Func<TItem, int> valueSelector,
        CancellationToken cancellationToken)
        where TKey : notnull
    {
        var result = new Dictionary<TKey, int>();
        await foreach (var item in source.WithCancellation(cancellationToken))
        {
            result[keySelector(item)] = valueSelector(item);
        }

        return result;
    }

    private readonly record struct LotStatusCountRow(LotStatus Status, int Count);
    private readonly record struct ProcedureStatusCountRow(ProcurementProcedureStatus Status, int Count);
    private readonly record struct ContractStatusCountRow(ContractStatus Status, int Count);
}
