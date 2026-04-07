using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcurementProcedure : SoftDeletableEntity
{
    public Guid LotId { get; set; }
    public ProcurementProcedureStatus Status { get; set; } = ProcurementProcedureStatus.Created;

    public DateTime? RequestDate { get; set; }
    public string PurchaseTypeCode { get; set; } = string.Empty;
    public Guid? InitiatorUserId { get; set; }
    public Guid? ResponsibleCommercialUserId { get; set; }

    public string ObjectName { get; set; } = string.Empty;
    public string WorkScope { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string LeadOfficeCode { get; set; } = string.Empty;
    public string AnalyticsLevel1Code { get; set; } = string.Empty;
    public string AnalyticsLevel2Code { get; set; } = string.Empty;
    public string AnalyticsLevel3Code { get; set; } = string.Empty;
    public string AnalyticsLevel4Code { get; set; } = string.Empty;
    public string AnalyticsLevel5Code { get; set; } = string.Empty;

    public string? CustomerContractNumber { get; set; }
    public DateTime? CustomerContractDate { get; set; }
    public DateTime? RequiredSubcontractorDeadline { get; set; }
    public DateTime? ProposalDueDate { get; set; }
    public decimal? PlannedBudgetWithoutVat { get; set; }
    public string? Notes { get; set; }

    public ProcedureApprovalMode ApprovalMode { get; set; } = ProcedureApprovalMode.InSystem;
    public string? ApprovalRouteCode { get; set; }
    public bool ContainsConfidentialInfo { get; set; }
    public bool RequiresTechnicalNegotiations { get; set; }
}
