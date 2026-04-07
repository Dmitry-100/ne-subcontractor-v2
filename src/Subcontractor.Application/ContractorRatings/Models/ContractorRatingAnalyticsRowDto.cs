using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.ContractorRatings.Models;

public sealed record ContractorRatingAnalyticsRowDto(
    Guid ContractorId,
    string ContractorName,
    ContractorStatus ContractorStatus,
    ReliabilityClass ReliabilityClass,
    decimal CurrentRating,
    decimal CurrentLoadPercent,
    DateTimeOffset? LastCalculatedAtUtc,
    string? ModelVersionCode,
    decimal? RatingDelta);

