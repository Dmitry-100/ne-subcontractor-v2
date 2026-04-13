using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed record ProcedureShortlistRecommendationCandidateModel(
    Guid ContractorId,
    string ContractorName,
    bool IsRecommended,
    decimal Score,
    ContractorStatus ContractorStatus,
    ReliabilityClass ReliabilityClass,
    decimal CurrentRating,
    decimal CurrentLoadPercent,
    bool HasRequiredQualifications,
    IReadOnlyList<string> MissingDisciplineCodes,
    IReadOnlyList<string> DecisionFactors);
