namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsTopContractorDto(
    Guid ContractorId,
    string Name,
    decimal CurrentRating,
    decimal CurrentLoadPercent,
    string ReliabilityClass,
    string Status,
    DateTimeOffset? LastRatingCalculatedAtUtc);
