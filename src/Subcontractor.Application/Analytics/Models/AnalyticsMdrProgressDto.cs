namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsMdrProgressDto(
    int CardsTotal,
    int RowsTotal,
    int RowsWithFact,
    decimal? FactCoveragePercent);
