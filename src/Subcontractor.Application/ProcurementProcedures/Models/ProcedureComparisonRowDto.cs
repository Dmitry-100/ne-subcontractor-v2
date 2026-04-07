using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureComparisonRowDto(
    Guid ContractorId,
    string ContractorName,
    bool IsShortlisted,
    int? ShortlistSortOrder,
    string? ExclusionReason,
    Guid? OfferId,
    string? OfferNumber,
    DateTime? ReceivedDate,
    decimal? AmountWithoutVat,
    decimal? VatAmount,
    decimal? TotalAmount,
    int? DurationDays,
    string? CurrencyCode,
    ProcedureOfferQualificationStatus? QualificationStatus,
    ProcedureOfferDecisionStatus? DecisionStatus,
    string? Notes);
