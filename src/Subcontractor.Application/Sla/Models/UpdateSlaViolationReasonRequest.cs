namespace Subcontractor.Application.Sla.Models;

public sealed class UpdateSlaViolationReasonRequest
{
    public string ReasonCode { get; set; } = string.Empty;
    public string? ReasonComment { get; set; }
}
