namespace Subcontractor.Application.Lots.Models;

public sealed record ApplyLotRecommendationsResultDto(
    Guid BatchId,
    int RequestedGroups,
    IReadOnlyList<CreatedLotFromRecommendationDto> CreatedLots,
    IReadOnlyList<SkippedLotRecommendationDto> SkippedGroups);
