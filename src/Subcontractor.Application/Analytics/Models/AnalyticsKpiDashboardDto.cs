namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsKpiDashboardDto(
    DateTimeOffset GeneratedAtUtc,
    IReadOnlyList<AnalyticsLotFunnelStageDto> LotFunnel,
    AnalyticsContractorLoadDto ContractorLoad,
    AnalyticsSlaMetricsDto Sla,
    AnalyticsContractingAmountsDto ContractingAmounts,
    AnalyticsMdrProgressDto MdrProgress,
    AnalyticsSubcontractingShareDto SubcontractingShare,
    IReadOnlyList<AnalyticsTopContractorDto> TopContractors);
