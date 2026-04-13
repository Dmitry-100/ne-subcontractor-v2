using Subcontractor.Application.ProcurementProcedures.Models;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureShortlistApplyPolicy
{
    public static int NormalizeMaxIncluded(int maxIncluded)
    {
        return maxIncluded switch
        {
            < 1 => 1,
            > 30 => 30,
            _ => maxIncluded
        };
    }

    public static string ResolveAdjustmentReason(string? adjustmentReason)
    {
        return string.IsNullOrWhiteSpace(adjustmentReason)
            ? "Auto shortlist apply"
            : adjustmentReason.Trim();
    }

    public static ProcedureShortlistRecommendationDto[] SelectRecommended(
        IReadOnlyList<ProcedureShortlistRecommendationDto> recommendations,
        int normalizedMaxIncluded)
    {
        return recommendations
            .Where(x => x.IsRecommended)
            .Take(normalizedMaxIncluded)
            .ToArray();
    }

    public static UpdateProcedureShortlistRequest BuildUpsertRequest(
        IReadOnlyList<ProcedureShortlistRecommendationDto> selected,
        string adjustmentReason)
    {
        return new UpdateProcedureShortlistRequest
        {
            AdjustmentReason = adjustmentReason,
            Items = selected
                .Select((x, index) => new UpsertProcedureShortlistItemRequest
                {
                    ContractorId = x.ContractorId,
                    IsIncluded = true,
                    SortOrder = index
                })
                .ToArray()
        };
    }
}
