using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcedureApprovalStep : AuditableEntity
{
    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public int StepOrder { get; set; }
    public string StepTitle { get; set; } = string.Empty;
    public Guid? ApproverUserId { get; set; }
    public string? ApproverRoleName { get; set; }
    public bool IsRequired { get; set; } = true;

    public ProcedureApprovalStepStatus Status { get; set; } = ProcedureApprovalStepStatus.Pending;
    public Guid? DecisionByUserId { get; set; }
    public DateTimeOffset? DecisionAtUtc { get; set; }
    public string? DecisionComment { get; set; }
}
