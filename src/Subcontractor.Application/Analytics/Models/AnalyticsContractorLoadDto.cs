namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsContractorLoadDto(
    int ActiveContractors,
    int OverloadedContractors,
    int HighRatingContractors,
    decimal? AverageLoadPercent,
    decimal? AverageRating);
