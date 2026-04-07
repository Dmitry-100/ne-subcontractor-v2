namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureExternalApprovalDto(
    Guid? Id,
    bool? IsApproved,
    DateTime? DecisionDate,
    Guid? ResponsibleUserId,
    Guid? ProtocolFileId,
    string? Comment);
