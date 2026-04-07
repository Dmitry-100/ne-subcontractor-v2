namespace Subcontractor.Application.Lots.Models;

public sealed class ApplyLotRecommendationGroupRequest
{
    public string GroupKey { get; set; } = string.Empty;
    public string? LotCode { get; set; }
    public string? LotName { get; set; }
}
