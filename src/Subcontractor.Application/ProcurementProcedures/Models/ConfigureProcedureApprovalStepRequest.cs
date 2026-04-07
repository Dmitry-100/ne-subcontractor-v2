namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class ConfigureProcedureApprovalStepRequest
{
    public int StepOrder { get; set; }
    public string StepTitle { get; set; } = string.Empty;
    public Guid? ApproverUserId { get; set; }
    public string? ApproverRoleName { get; set; }
    public bool IsRequired { get; set; } = true;
}
