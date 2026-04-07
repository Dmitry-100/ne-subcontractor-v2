using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class ProcedureStatusTransitionRequest
{
    public ProcurementProcedureStatus TargetStatus { get; set; }
    public string? Reason { get; set; }
}
