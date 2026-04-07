using Subcontractor.Domain.Common;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcedureOffer : AuditableEntity
{
    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public Guid ContractorId { get; set; }
    public Contractor Contractor { get; set; } = null!;

    public string OfferNumber { get; set; } = string.Empty;
    public DateTime? ReceivedDate { get; set; }
    public decimal AmountWithoutVat { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public int? DurationDays { get; set; }
    public string CurrencyCode { get; set; } = "RUB";
    public ProcedureOfferQualificationStatus QualificationStatus { get; set; } = ProcedureOfferQualificationStatus.Unknown;
    public ProcedureOfferDecisionStatus DecisionStatus { get; set; } = ProcedureOfferDecisionStatus.Pending;
    public Guid? OfferFileId { get; set; }
    public string? Notes { get; set; }
}
