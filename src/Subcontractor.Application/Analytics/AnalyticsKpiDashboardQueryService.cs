using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Analytics;

public sealed class AnalyticsKpiDashboardQueryService
{
    private static readonly Func<DbContext, IAsyncEnumerable<LotFunnelCountRow>> CompiledLotFunnelCountsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<Lot>()
                    .AsNoTracking()
                    .GroupBy(x => x.Status)
                    .Select(x => new LotFunnelCountRow(x.Key, x.Count())));

    private static readonly Func<DbContext, Task<ContractorLoadAggregateRow>> CompiledContractorLoadAggregateQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<Contractor>()
                    .AsNoTracking()
                    .Where(x => x.Status == ContractorStatus.Active)
                    .GroupBy(_ => 1)
                    .Select(x => new ContractorLoadAggregateRow(
                        x.Count(),
                        x.Count(c => c.CurrentLoadPercent > 100m),
                        x.Count(c => c.CurrentRating >= 4.0m),
                        (decimal?)x.Average(c => c.CurrentLoadPercent),
                        (decimal?)x.Average(c => c.CurrentRating)))
                    .FirstOrDefault());

    private static readonly Func<DbContext, DateTime, Task<SlaMetricsAggregateRow>> CompiledSlaMetricsAggregateQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext, DateTime threshold) =>
                dbContext.Set<SlaViolation>()
                    .AsNoTracking()
                    .GroupBy(_ => 1)
                    .Select(x => new SlaMetricsAggregateRow(
                        x.Count(v => !v.IsResolved && v.Severity == SlaViolationSeverity.Warning),
                        x.Count(v => !v.IsResolved && v.Severity == SlaViolationSeverity.Overdue),
                        x.Count(v => v.IsResolved && v.ResolvedAtUtc.HasValue && v.ResolvedAtUtc.Value >= threshold)))
                    .FirstOrDefault());

    private static readonly Func<DbContext, Task<ContractingAmountsAggregateRow>> CompiledContractingAmountsAggregateQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<Contract>()
                    .AsNoTracking()
                    .GroupBy(_ => 1)
                    .Select(x => new ContractingAmountsAggregateRow(
                        x.Where(c => c.Status == ContractStatus.Signed || c.Status == ContractStatus.Active)
                            .Sum(c => (decimal?)c.TotalAmount) ?? 0m,
                        x.Where(c => c.Status == ContractStatus.Closed)
                            .Sum(c => (decimal?)c.TotalAmount) ?? 0m,
                        x.Where(c => c.Status != ContractStatus.Draft)
                            .Average(c => (decimal?)c.TotalAmount)))
                    .FirstOrDefault());

    private static readonly Func<DbContext, Task<int>> CompiledMdrCardsTotalCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<ContractMdrCard>()
                    .AsNoTracking()
                    .Count());

    private static readonly Func<DbContext, Task<MdrRowsAggregateRow>> CompiledMdrRowsAggregateQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<ContractMdrRow>()
                    .AsNoTracking()
                    .GroupBy(_ => 1)
                    .Select(x => new MdrRowsAggregateRow(
                        x.Count(),
                        x.Count(row => row.FactValue > 0m)))
                    .FirstOrDefault());

    private static readonly Func<DbContext, IAsyncEnumerable<TopContractorRow>> CompiledTopContractorsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<Contractor>()
                    .AsNoTracking()
                    .Where(x => x.Status == ContractorStatus.Active)
                    .OrderByDescending(x => x.CurrentRating)
                    .ThenBy(x => x.CurrentLoadPercent)
                    .ThenBy(x => x.Name)
                    .Take(10)
                    .Select(x => new TopContractorRow(
                        x.Id,
                        x.Name,
                        x.CurrentRating,
                        x.CurrentLoadPercent,
                        x.ReliabilityClass,
                        x.Status)));

    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;

    public AnalyticsKpiDashboardQueryService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<AnalyticsKpiDashboardDto> GetKpiDashboardAsync(CancellationToken cancellationToken = default)
    {
        var utcNow = _dateTimeProvider.UtcNow;
        var lotFunnel = await BuildLotFunnelAsync(cancellationToken);
        var contractorLoad = await BuildContractorLoadAsync(cancellationToken);
        var slaMetrics = await BuildSlaMetricsAsync(utcNow, cancellationToken);
        var contractingAmounts = await BuildContractingAmountsAsync(cancellationToken);
        var mdrProgress = await BuildMdrProgressAsync(cancellationToken);
        var subcontractingShare = await BuildSubcontractingShareAsync(cancellationToken);
        var topContractors = await BuildTopContractorsAsync(cancellationToken);

        return new AnalyticsKpiDashboardDto(
            utcNow,
            lotFunnel,
            contractorLoad,
            slaMetrics,
            contractingAmounts,
            mdrProgress,
            subcontractingShare,
            topContractors);
    }

    private async Task<IReadOnlyList<AnalyticsLotFunnelStageDto>> BuildLotFunnelAsync(CancellationToken cancellationToken)
    {
        Dictionary<LotStatus, int> counts;
        if (_dbContext is DbContext efDbContext)
        {
            counts = await ToDictionaryAsync(
                CompiledLotFunnelCountsQuery(efDbContext),
                x => x.Status,
                x => x.Count,
                cancellationToken);
        }
        else
        {
            counts = await _dbContext.Lots
                .AsNoTracking()
                .GroupBy(x => x.Status)
                .Select(x => new { x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
        }

        return Enum.GetValues<LotStatus>()
            .Select(status => new AnalyticsLotFunnelStageDto(
                status.ToString(),
                counts.TryGetValue(status, out var count) ? count : 0))
            .ToArray();
    }

    private async Task<AnalyticsContractorLoadDto> BuildContractorLoadAsync(CancellationToken cancellationToken)
    {
        ContractorLoadAggregateRow aggregate;
        if (_dbContext is DbContext efDbContext)
        {
            aggregate = await CompiledContractorLoadAggregateQuery(efDbContext)
                .WaitAsync(cancellationToken);
        }
        else
        {
            aggregate = await _dbContext.Contractors
                .AsNoTracking()
                .Where(x => x.Status == ContractorStatus.Active)
                .GroupBy(_ => 1)
                .Select(x => new ContractorLoadAggregateRow(
                    x.Count(),
                    x.Count(c => c.CurrentLoadPercent > 100m),
                    x.Count(c => c.CurrentRating >= 4.0m),
                    (decimal?)x.Average(c => c.CurrentLoadPercent),
                    (decimal?)x.Average(c => c.CurrentRating)))
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new AnalyticsContractorLoadDto(
            aggregate.ActiveCount,
            aggregate.OverloadedCount,
            aggregate.HighRatingCount,
            RoundNullable(aggregate.AverageLoadPercent),
            RoundNullable(aggregate.AverageRating));
    }

    private async Task<AnalyticsSlaMetricsDto> BuildSlaMetricsAsync(DateTimeOffset utcNow, CancellationToken cancellationToken)
    {
        var threshold = utcNow.UtcDateTime.AddDays(-30);
        SlaMetricsAggregateRow aggregate;
        if (_dbContext is DbContext efDbContext)
        {
            aggregate = await CompiledSlaMetricsAggregateQuery(efDbContext, threshold)
                .WaitAsync(cancellationToken);
        }
        else
        {
            aggregate = await _dbContext.SlaViolations
                .AsNoTracking()
                .GroupBy(_ => 1)
                .Select(x => new SlaMetricsAggregateRow(
                    x.Count(v => !v.IsResolved && v.Severity == SlaViolationSeverity.Warning),
                    x.Count(v => !v.IsResolved && v.Severity == SlaViolationSeverity.Overdue),
                    x.Count(v => v.IsResolved && v.ResolvedAtUtc.HasValue && v.ResolvedAtUtc.Value >= threshold)))
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new AnalyticsSlaMetricsDto(
            aggregate.OpenWarnings,
            aggregate.OpenOverdue,
            aggregate.ResolvedLast30Days);
    }

    private async Task<AnalyticsContractingAmountsDto> BuildContractingAmountsAsync(CancellationToken cancellationToken)
    {
        ContractingAmountsAggregateRow aggregate;
        if (_dbContext is DbContext efDbContext)
        {
            aggregate = await CompiledContractingAmountsAggregateQuery(efDbContext)
                .WaitAsync(cancellationToken);
        }
        else
        {
            aggregate = await _dbContext.Contracts
                .AsNoTracking()
                .GroupBy(_ => 1)
                .Select(x => new ContractingAmountsAggregateRow(
                    x.Where(c => c.Status == ContractStatus.Signed || c.Status == ContractStatus.Active)
                        .Sum(c => (decimal?)c.TotalAmount) ?? 0m,
                    x.Where(c => c.Status == ContractStatus.Closed)
                        .Sum(c => (decimal?)c.TotalAmount) ?? 0m,
                    x.Where(c => c.Status != ContractStatus.Draft)
                        .Average(c => (decimal?)c.TotalAmount)))
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new AnalyticsContractingAmountsDto(
            decimal.Round(aggregate.SignedAndActiveTotalAmount, 2, MidpointRounding.AwayFromZero),
            decimal.Round(aggregate.ClosedTotalAmount, 2, MidpointRounding.AwayFromZero),
            RoundNullable(aggregate.AverageTotalAmount, 2));
    }

    private async Task<AnalyticsMdrProgressDto> BuildMdrProgressAsync(CancellationToken cancellationToken)
    {
        int cardsTotal;
        MdrRowsAggregateRow rowsAggregate;
        if (_dbContext is DbContext efDbContext)
        {
            cardsTotal = await CompiledMdrCardsTotalCountQuery(efDbContext)
                .WaitAsync(cancellationToken);
            rowsAggregate = await CompiledMdrRowsAggregateQuery(efDbContext)
                .WaitAsync(cancellationToken);
        }
        else
        {
            cardsTotal = await _dbContext.ContractMdrCards
                .AsNoTracking()
                .CountAsync(cancellationToken);

            rowsAggregate = await _dbContext.ContractMdrRows
                .AsNoTracking()
                .GroupBy(_ => 1)
                .Select(x => new MdrRowsAggregateRow(
                    x.Count(),
                    x.Count(row => row.FactValue > 0m)))
                .FirstOrDefaultAsync(cancellationToken);
        }

        var rowsTotal = rowsAggregate.RowsTotal;
        var rowsWithFact = rowsAggregate.RowsWithFact;

        return new AnalyticsMdrProgressDto(
            cardsTotal,
            rowsTotal,
            rowsWithFact,
            CalculatePercent(rowsWithFact, rowsTotal));
    }

    private async Task<AnalyticsSubcontractingShareDto> BuildSubcontractingShareAsync(CancellationToken cancellationToken)
    {
        var totalPlannedManHours = await _dbContext.Set<LotItem>()
            .AsNoTracking()
            .SumAsync(x => (decimal?)x.ManHours, cancellationToken) ?? 0m;

        var contractedLotIds = await _dbContext.Contracts
            .AsNoTracking()
            .Where(x => x.Status == ContractStatus.Signed || x.Status == ContractStatus.Active || x.Status == ContractStatus.Closed)
            .Select(x => x.LotId)
            .Distinct()
            .ToArrayAsync(cancellationToken);

        decimal contractedManHours;
        if (contractedLotIds.Length == 0)
        {
            contractedManHours = 0m;
        }
        else
        {
            contractedManHours = await _dbContext.Set<LotItem>()
                .AsNoTracking()
                .Where(x => contractedLotIds.Contains(x.LotId))
                .SumAsync(x => (decimal?)x.ManHours, cancellationToken) ?? 0m;
        }

        return new AnalyticsSubcontractingShareDto(
            decimal.Round(totalPlannedManHours, 2, MidpointRounding.AwayFromZero),
            decimal.Round(contractedManHours, 2, MidpointRounding.AwayFromZero),
            CalculatePercent(contractedManHours, totalPlannedManHours));
    }

    private async Task<IReadOnlyList<AnalyticsTopContractorDto>> BuildTopContractorsAsync(CancellationToken cancellationToken)
    {
        TopContractorRow[] contractors;
        if (_dbContext is DbContext efDbContext)
        {
            contractors = await ToArrayAsync(CompiledTopContractorsQuery(efDbContext), cancellationToken);
        }
        else
        {
            contractors = await _dbContext.Contractors
                .AsNoTracking()
                .Where(x => x.Status == ContractorStatus.Active)
                .OrderByDescending(x => x.CurrentRating)
                .ThenBy(x => x.CurrentLoadPercent)
                .ThenBy(x => x.Name)
                .Take(10)
                .Select(x => new TopContractorRow(
                    x.Id,
                    x.Name,
                    x.CurrentRating,
                    x.CurrentLoadPercent,
                    x.ReliabilityClass,
                    x.Status))
                .ToArrayAsync(cancellationToken);
        }

        if (contractors.Length == 0)
        {
            return Array.Empty<AnalyticsTopContractorDto>();
        }

        var contractorIds = contractors.Select(x => x.Id).ToArray();
        var latestHistory = await _dbContext.ContractorRatingHistoryEntries
            .AsNoTracking()
            .Where(x => contractorIds.Contains(x.ContractorId))
            .GroupBy(x => x.ContractorId)
            .Select(x => new
            {
                ContractorId = x.Key,
                LastCalculatedAtUtc = x.Max(y => y.CalculatedAtUtc)
            })
            .ToDictionaryAsync(
                x => x.ContractorId,
                x => (DateTimeOffset?)x.LastCalculatedAtUtc,
                cancellationToken);

        return contractors
            .Select(x => new AnalyticsTopContractorDto(
                x.Id,
                x.Name,
                decimal.Round(x.CurrentRating, 3, MidpointRounding.AwayFromZero),
                decimal.Round(x.CurrentLoadPercent, 2, MidpointRounding.AwayFromZero),
                x.ReliabilityClass.ToString(),
                x.Status.ToString(),
                latestHistory.GetValueOrDefault(x.Id)))
            .ToArray();
    }

    private static decimal? CalculatePercent(decimal numerator, decimal denominator)
    {
        if (denominator <= 0m)
        {
            return null;
        }

        return decimal.Round(numerator / denominator * 100m, 2, MidpointRounding.AwayFromZero);
    }

    private static decimal? CalculatePercent(int numerator, int denominator)
    {
        if (denominator <= 0)
        {
            return null;
        }

        return decimal.Round((decimal)numerator / denominator * 100m, 2, MidpointRounding.AwayFromZero);
    }

    private static decimal? RoundNullable(decimal? value, int scale = 2)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return decimal.Round(value.Value, scale, MidpointRounding.AwayFromZero);
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

    private static async Task<TItem[]> ToArrayAsync<TItem>(
        IAsyncEnumerable<TItem> source,
        CancellationToken cancellationToken)
    {
        var result = new List<TItem>();
        await foreach (var item in source.WithCancellation(cancellationToken))
        {
            result.Add(item);
        }

        return result.ToArray();
    }

    private readonly record struct LotFunnelCountRow(LotStatus Status, int Count);
    private readonly record struct ContractorLoadAggregateRow(
        int ActiveCount,
        int OverloadedCount,
        int HighRatingCount,
        decimal? AverageLoadPercent,
        decimal? AverageRating);
    private readonly record struct SlaMetricsAggregateRow(int OpenWarnings, int OpenOverdue, int ResolvedLast30Days);
    private readonly record struct ContractingAmountsAggregateRow(
        decimal SignedAndActiveTotalAmount,
        decimal ClosedTotalAmount,
        decimal? AverageTotalAmount);
    private readonly record struct MdrRowsAggregateRow(int RowsTotal, int RowsWithFact);
    private readonly record struct TopContractorRow(
        Guid Id,
        string Name,
        decimal CurrentRating,
        decimal CurrentLoadPercent,
        ReliabilityClass ReliabilityClass,
        ContractorStatus Status);
}
