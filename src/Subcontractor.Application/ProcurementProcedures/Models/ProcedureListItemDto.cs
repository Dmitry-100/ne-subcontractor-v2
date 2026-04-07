using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureListItemDto(
    Guid Id,
    Guid LotId,
    ProcurementProcedureStatus Status,
    string PurchaseTypeCode,
    string ObjectName,
    Guid? InitiatorUserId,
    Guid? ResponsibleCommercialUserId,
    DateTime? RequiredSubcontractorDeadline,
    ProcedureApprovalMode ApprovalMode);
