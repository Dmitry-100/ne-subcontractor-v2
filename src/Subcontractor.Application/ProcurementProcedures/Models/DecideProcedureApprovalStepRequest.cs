using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class DecideProcedureApprovalStepRequest
{
    public ProcedureApprovalStepStatus DecisionStatus { get; set; }
    public string? Comment { get; set; }
}
