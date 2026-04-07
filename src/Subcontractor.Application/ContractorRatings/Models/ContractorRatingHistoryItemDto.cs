using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Application.ContractorRatings.Models;

public sealed record ContractorRatingHistoryItemDto(
    Guid Id,
    Guid ContractorId,
    Guid ModelVersionId,
    string ModelVersionCode,
    ContractorRatingRecordSourceType SourceType,
    DateTimeOffset CalculatedAtUtc,
    decimal DeliveryDisciplineScore,
    decimal CommercialDisciplineScore,
    decimal ClaimDisciplineScore,
    decimal ManualExpertScore,
    decimal WorkloadPenaltyScore,
    decimal FinalScore,
    string? Notes,
    string CreatedBy);

