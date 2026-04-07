using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureApprovalStepDto(
    Guid Id,
    int StepOrder,
    string StepTitle,
    Guid? ApproverUserId,
    string? ApproverRoleName,
    bool IsRequired,
    ProcedureApprovalStepStatus Status,
    Guid? DecisionByUserId,
    DateTimeOffset? DecisionAtUtc,
    string? DecisionComment);
