namespace Subcontractor.Application.ContractorRatings.Models;

public sealed record ContractorRatingManualAssessmentDto(
    Guid Id,
    Guid ContractorId,
    Guid ModelVersionId,
    decimal Score,
    string? Comment,
    DateTimeOffset CreatedAtUtc,
    string CreatedBy);

