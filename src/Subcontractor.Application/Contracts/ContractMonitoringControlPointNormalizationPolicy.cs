using Subcontractor.Application.Contracts.Models;

namespace Subcontractor.Application.Contracts;

internal static class ContractMonitoringControlPointNormalizationPolicy
{
    public static NormalizedControlPointItem[] NormalizeControlPointItems(
        IReadOnlyCollection<UpsertContractMonitoringControlPointItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedControlPointItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var name = item.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException($"Control point #{index}: name is required.");
            }

            if (item.PlannedDate == default)
            {
                throw new ArgumentException($"Control point #{index}: planned date is required.");
            }

            if (item.ProgressPercent < 0m || item.ProgressPercent > 100m)
            {
                throw new ArgumentException($"Control point #{index}: progress must be in range 0..100.");
            }

            var stages = NormalizeControlPointStageItems(item.Stages, index);
            result.Add(new NormalizedControlPointItem(
                name,
                NormalizeOptionalText(item.ResponsibleRole),
                item.PlannedDate.Date,
                item.ForecastDate?.Date,
                item.ActualDate?.Date,
                decimal.Round(item.ProgressPercent, 2, MidpointRounding.AwayFromZero),
                Math.Max(0, item.SortOrder),
                NormalizeOptionalText(item.Notes),
                stages));
        }

        return result.ToArray();
    }

    private static IReadOnlyList<NormalizedControlPointStageItem> NormalizeControlPointStageItems(
        IReadOnlyCollection<UpsertContractMonitoringControlPointStageItemRequest>? items,
        int parentIndex)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedControlPointStageItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var name = item.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException($"Control point #{parentIndex} stage #{index}: name is required.");
            }

            if (item.PlannedDate == default)
            {
                throw new ArgumentException($"Control point #{parentIndex} stage #{index}: planned date is required.");
            }

            if (item.ProgressPercent < 0m || item.ProgressPercent > 100m)
            {
                throw new ArgumentException($"Control point #{parentIndex} stage #{index}: progress must be in range 0..100.");
            }

            result.Add(new NormalizedControlPointStageItem(
                name,
                item.PlannedDate.Date,
                item.ForecastDate?.Date,
                item.ActualDate?.Date,
                decimal.Round(item.ProgressPercent, 2, MidpointRounding.AwayFromZero),
                Math.Max(0, item.SortOrder),
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

    internal sealed record NormalizedControlPointItem(
        string Name,
        string? ResponsibleRole,
        DateTime PlannedDate,
        DateTime? ForecastDate,
        DateTime? ActualDate,
        decimal ProgressPercent,
        int SortOrder,
        string? Notes,
        IReadOnlyList<NormalizedControlPointStageItem> Stages);

    internal sealed record NormalizedControlPointStageItem(
        string Name,
        DateTime PlannedDate,
        DateTime? ForecastDate,
        DateTime? ActualDate,
        decimal ProgressPercent,
        int SortOrder,
        string? Notes);
}
