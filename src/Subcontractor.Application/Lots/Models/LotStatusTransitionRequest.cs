using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots.Models;

public sealed class LotStatusTransitionRequest
{
    public LotStatus TargetStatus { get; set; }
    public string? Reason { get; set; }
}
