namespace Subcontractor.Application.Lots.Models;

public sealed class ApplyLotRecommendationsRequest
{
    public IReadOnlyCollection<ApplyLotRecommendationGroupRequest> Groups { get; set; } =
        Array.Empty<ApplyLotRecommendationGroupRequest>();
}
