using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureOfferDto(
    Guid Id,
    Guid ContractorId,
    string ContractorName,
    string OfferNumber,
    DateTime? ReceivedDate,
    decimal AmountWithoutVat,
    decimal VatAmount,
    decimal TotalAmount,
    int? DurationDays,
    string CurrencyCode,
    ProcedureOfferQualificationStatus QualificationStatus,
    ProcedureOfferDecisionStatus DecisionStatus,
    Guid? OfferFileId,
    string? Notes);
