namespace Subcontractor.Application.Lots.Models;

public sealed record SkippedLotRecommendationDto(
    string GroupKey,
    string Reason);
