namespace Subcontractor.Application.ContractorRatings.Models;

public sealed record ContractorRatingModelDto(
    Guid Id,
    string VersionCode,
    string Name,
    bool IsActive,
    DateTimeOffset? ActivatedAtUtc,
    string? Notes,
    IReadOnlyList<ContractorRatingWeightDto> Weights);

