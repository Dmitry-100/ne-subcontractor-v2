using Subcontractor.Application.Contracts.Models;

namespace Subcontractor.Application.Contracts;

internal static class ContractMilestoneNormalizationPolicy
{
    public static NormalizedMilestoneItem[] NormalizeMilestoneItems(IReadOnlyCollection<UpsertContractMilestoneItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMilestoneItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var title = item.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new ArgumentException($"Milestone #{index}: title is required.");
            }

            if (item.PlannedDate == default)
            {
                throw new ArgumentException($"Milestone #{index}: planned date is required.");
            }

            if (item.ProgressPercent < 0m || item.ProgressPercent > 100m)
            {
                throw new ArgumentException($"Milestone #{index}: progress must be in range 0..100.");
            }

            if (item.SortOrder < 0)
            {
                throw new ArgumentException($"Milestone #{index}: sort order must be non-negative.");
            }

            result.Add(new NormalizedMilestoneItem(
                title,
                item.PlannedDate.Date,
                item.ActualDate?.Date,
                decimal.Round(item.ProgressPercent, 2, MidpointRounding.AwayFromZero),
                item.SortOrder,
                NormalizeOptionalText(item.Notes)));
        }

        return result.ToArray();
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return normalized.Length == 0 ? null : normalized;
    }

    internal sealed record NormalizedMilestoneItem(
        string Title,
        DateTime PlannedDate,
        DateTime? ActualDate,
        decimal ProgressPercent,
        int SortOrder,
        string? Notes);
}
