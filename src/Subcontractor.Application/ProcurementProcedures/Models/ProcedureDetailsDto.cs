using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureDetailsDto(
    Guid Id,
    Guid LotId,
    ProcurementProcedureStatus Status,
    DateTime? RequestDate,
    string PurchaseTypeCode,
    Guid? InitiatorUserId,
    Guid? ResponsibleCommercialUserId,
    string ObjectName,
    string WorkScope,
    string CustomerName,
    string LeadOfficeCode,
    string AnalyticsLevel1Code,
    string AnalyticsLevel2Code,
    string AnalyticsLevel3Code,
    string AnalyticsLevel4Code,
    string AnalyticsLevel5Code,
    string? CustomerContractNumber,
    DateTime? CustomerContractDate,
    DateTime? RequiredSubcontractorDeadline,
    DateTime? ProposalDueDate,
    decimal? PlannedBudgetWithoutVat,
    string? Notes,
    ProcedureApprovalMode ApprovalMode,
    string? ApprovalRouteCode,
    bool ContainsConfidentialInfo,
    bool RequiresTechnicalNegotiations,
    IReadOnlyCollection<ProcedureAttachmentDto> Attachments);
