using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class UpsertProcedureOfferItemRequest
{
    public Guid ContractorId { get; set; }
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
