namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsSlaMetricsDto(
    int OpenWarnings,
    int OpenOverdue,
    int ResolvedLast30Days);
