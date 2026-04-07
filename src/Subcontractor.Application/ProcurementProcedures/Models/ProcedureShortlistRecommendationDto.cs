using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureShortlistRecommendationDto(
    Guid ContractorId,
    string ContractorName,
    bool IsRecommended,
    int? SuggestedSortOrder,
    decimal Score,
    ContractorStatus ContractorStatus,
    ReliabilityClass ReliabilityClass,
    decimal CurrentRating,
    decimal CurrentLoadPercent,
    bool HasRequiredQualifications,
    IReadOnlyList<string> MissingDisciplineCodes,
    IReadOnlyList<string> DecisionFactors);
