using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Analytics;

public sealed class AnalyticsService : IAnalyticsService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;

    public AnalyticsService(
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

    public Task<IReadOnlyList<AnalyticsViewDescriptorDto>> GetViewCatalogAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<AnalyticsViewDescriptorDto> catalog =
        [
            new("vwAnalytics_LotFunnel", "Воронка лотов по статусам.", "Status", "KPI dashboard / Power BI"),
            new("vwAnalytics_ContractorLoad", "Профиль загрузки подрядчиков.", "Contractor", "Load and capacity analytics"),
            new("vwAnalytics_SlaMetrics", "SLA-метрики по severity и статусу.", "Severity + IsResolved", "SLA monitoring"),
            new("vwAnalytics_ContractingAmounts", "Суммы контрактования по статусам договоров.", "Contract status", "Finance and procurement analytics"),
            new("vwAnalytics_MdrProgress", "Покрытие MDR строк факт-данными.", "Card + Row", "MDR execution analytics"),
            new("vwAnalytics_SubcontractingShare", "Доля контрактованного субподряда по man-hours.", "Global", "Management KPI"),
            new("vwAnalytics_ContractorRatings", "Свод текущих рейтингов и загрузки подрядчиков.", "Contractor", "Rating and shortlist analytics")
        ];

        return Task.FromResult(catalog);
    }

    private async Task<IReadOnlyList<AnalyticsLotFunnelStageDto>> BuildLotFunnelAsync(CancellationToken cancellationToken)
    {
        var counts = await _dbContext.Lots
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        return Enum.GetValues<LotStatus>()
            .Select(status => new AnalyticsLotFunnelStageDto(
                status.ToString(),
                counts.TryGetValue(status, out var count) ? count : 0))
            .ToArray();
    }

    private async Task<AnalyticsContractorLoadDto> BuildContractorLoadAsync(CancellationToken cancellationToken)
    {
        var aggregate = await _dbContext.Contractors
            .AsNoTracking()
            .Where(x => x.Status == ContractorStatus.Active)
            .GroupBy(_ => 1)
            .Select(x => new
            {
                ActiveCount = x.Count(),
                OverloadedCount = x.Count(c => c.CurrentLoadPercent > 100m),
                HighRatingCount = x.Count(c => c.CurrentRating >= 4.0m),
                AvgLoad = (decimal?)x.Average(c => c.CurrentLoadPercent),
                AvgRating = (decimal?)x.Average(c => c.CurrentRating)
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new AnalyticsContractorLoadDto(
            aggregate?.ActiveCount ?? 0,
            aggregate?.OverloadedCount ?? 0,
            aggregate?.HighRatingCount ?? 0,
            RoundNullable(aggregate?.AvgLoad),
            RoundNullable(aggregate?.AvgRating));
    }

    private async Task<AnalyticsSlaMetricsDto> BuildSlaMetricsAsync(DateTimeOffset utcNow, CancellationToken cancellationToken)
    {
        var threshold = utcNow.UtcDateTime.AddDays(-30);
        var aggregate = await _dbContext.SlaViolations
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(x => new
            {
                OpenWarnings = x.Count(v => !v.IsResolved && v.Severity == SlaViolationSeverity.Warning),
                OpenOverdue = x.Count(v => !v.IsResolved && v.Severity == SlaViolationSeverity.Overdue),
                ResolvedLast30Days = x.Count(v => v.IsResolved && v.ResolvedAtUtc.HasValue && v.ResolvedAtUtc.Value >= threshold)
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new AnalyticsSlaMetricsDto(
            aggregate?.OpenWarnings ?? 0,
            aggregate?.OpenOverdue ?? 0,
            aggregate?.ResolvedLast30Days ?? 0);
    }

    private async Task<AnalyticsContractingAmountsDto> BuildContractingAmountsAsync(CancellationToken cancellationToken)
    {
        var aggregate = await _dbContext.Contracts
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(x => new
            {
                SignedAndActive = x
                    .Where(c => c.Status == ContractStatus.Signed || c.Status == ContractStatus.Active)
                    .Sum(c => (decimal?)c.TotalAmount) ?? 0m,
                Closed = x
                    .Where(c => c.Status == ContractStatus.Closed)
                    .Sum(c => (decimal?)c.TotalAmount) ?? 0m,
                AverageAmount = x
                    .Where(c => c.Status != ContractStatus.Draft)
                    .Average(c => (decimal?)c.TotalAmount)
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new AnalyticsContractingAmountsDto(
            decimal.Round(aggregate?.SignedAndActive ?? 0m, 2, MidpointRounding.AwayFromZero),
            decimal.Round(aggregate?.Closed ?? 0m, 2, MidpointRounding.AwayFromZero),
            RoundNullable(aggregate?.AverageAmount, 2));
    }

    private async Task<AnalyticsMdrProgressDto> BuildMdrProgressAsync(CancellationToken cancellationToken)
    {
        var cardsTotal = await _dbContext.ContractMdrCards
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var rowsAggregate = await _dbContext.ContractMdrRows
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(x => new
            {
                RowsTotal = x.Count(),
                RowsWithFact = x.Count(row => row.FactValue > 0m)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var rowsTotal = rowsAggregate?.RowsTotal ?? 0;
        var rowsWithFact = rowsAggregate?.RowsWithFact ?? 0;

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
        var contractors = await _dbContext.Contractors
            .AsNoTracking()
            .Where(x => x.Status == ContractorStatus.Active)
            .OrderByDescending(x => x.CurrentRating)
            .ThenBy(x => x.CurrentLoadPercent)
            .ThenBy(x => x.Name)
            .Take(10)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.CurrentRating,
                x.CurrentLoadPercent,
                x.ReliabilityClass,
                x.Status
            })
            .ToArrayAsync(cancellationToken);

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
}
