using Subcontractor.Application.ProcurementProcedures.Models;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureShortlistRecommendationOrderingPolicy
{
    public static IReadOnlyList<ProcedureShortlistRecommendationDto> BuildRecommendations(
        IReadOnlyList<ProcedureShortlistRecommendationCandidateModel> candidates)
    {
        var ordered = candidates
            .OrderByDescending(x => x.IsRecommended)
            .ThenByDescending(x => x.Score)
            .ThenBy(x => x.CurrentLoadPercent)
            .ThenBy(x => x.ContractorName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var recommendedSortOrder = 0;
        return ordered
            .Select(x => new ProcedureShortlistRecommendationDto(
                x.ContractorId,
                x.ContractorName,
                x.IsRecommended,
                x.IsRecommended ? recommendedSortOrder++ : null,
                x.Score,
                x.ContractorStatus,
                x.ReliabilityClass,
                x.CurrentRating,
                x.CurrentLoadPercent,
                x.HasRequiredQualifications,
                x.MissingDisciplineCodes,
                x.DecisionFactors))
            .ToArray();
    }
}
