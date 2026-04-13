using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

internal static class ContractMdrNormalizationPolicy
{
    public static NormalizedMdrCardItem[] NormalizeMdrCardItems(
        IReadOnlyCollection<UpsertContractMdrCardItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMdrCardItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var title = item.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new ArgumentException($"MDR card #{index}: title is required.");
            }

            if (item.ReportingDate == default)
            {
                throw new ArgumentException($"MDR card #{index}: reporting date is required.");
            }

            var rows = NormalizeMdrRowItems(item.Rows, index);
            result.Add(new NormalizedMdrCardItem(
                title,
                item.ReportingDate.Date,
                Math.Max(0, item.SortOrder),
                NormalizeOptionalText(item.Notes),
                rows));
        }

        return result.ToArray();
    }

    public static NormalizedMdrForecastFactImportItem[] NormalizeMdrForecastFactImportItems(
        IReadOnlyCollection<ImportContractMdrForecastFactItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMdrForecastFactImportItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var sourceRowNumber = item.SourceRowNumber > 0 ? item.SourceRowNumber : index;
            var cardTitle = item.CardTitle?.Trim();
            var rowCode = item.RowCode?.Trim();

            if (string.IsNullOrWhiteSpace(cardTitle))
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: card title is required.");
            }

            if (item.ReportingDate == default)
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: reporting date is required.");
            }

            if (string.IsNullOrWhiteSpace(rowCode))
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: row code is required.");
            }

            if (item.ForecastValue < 0m || item.FactValue < 0m)
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: forecast/fact values must be non-negative.");
            }

            result.Add(new NormalizedMdrForecastFactImportItem(
                sourceRowNumber,
                cardTitle,
                item.ReportingDate.Date,
                rowCode.ToUpperInvariant(),
                decimal.Round(item.ForecastValue, 2, MidpointRounding.AwayFromZero),
                decimal.Round(item.FactValue, 2, MidpointRounding.AwayFromZero)));
        }

        return result.ToArray();
    }

    public static Dictionary<string, ContractMdrRow> BuildImportRowIndex(
        IReadOnlyCollection<ContractMdrCard> cards,
        out HashSet<string> ambiguousKeys)
    {
        var index = new Dictionary<string, ContractMdrRow>(StringComparer.Ordinal);
        ambiguousKeys = new HashSet<string>(StringComparer.Ordinal);

        foreach (var card in cards)
        {
            foreach (var row in card.Rows)
            {
                var key = BuildImportKey(card.Title, card.ReportingDate, row.RowCode);
                if (index.TryAdd(key, row))
                {
                    continue;
                }

                ambiguousKeys.Add(key);
                index.Remove(key);
            }
        }

        return index;
    }

    public static string BuildImportKey(string cardTitle, DateTime reportingDate, string rowCode)
    {
        var titleToken = cardTitle.Trim().ToUpperInvariant();
        var rowToken = rowCode.Trim().ToUpperInvariant();
        return $"{titleToken}|{reportingDate.Date:yyyy-MM-dd}|{rowToken}";
    }

    private static IReadOnlyList<NormalizedMdrRowItem> NormalizeMdrRowItems(
        IReadOnlyCollection<UpsertContractMdrRowItemRequest>? items,
        int cardIndex)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMdrRowItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var rowCode = item.RowCode?.Trim();
            var description = item.Description?.Trim();
            var unitCode = item.UnitCode?.Trim();

            if (string.IsNullOrWhiteSpace(rowCode))
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: row code is required.");
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: description is required.");
            }

            if (string.IsNullOrWhiteSpace(unitCode))
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: unit code is required.");
            }

            if (item.PlanValue < 0m || item.ForecastValue < 0m || item.FactValue < 0m)
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: numeric values must be non-negative.");
            }

            result.Add(new NormalizedMdrRowItem(
                rowCode,
                description,
                unitCode.ToUpperInvariant(),
                decimal.Round(item.PlanValue, 2, MidpointRounding.AwayFromZero),
                decimal.Round(item.ForecastValue, 2, MidpointRounding.AwayFromZero),
                decimal.Round(item.FactValue, 2, MidpointRounding.AwayFromZero),
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

    internal sealed record NormalizedMdrCardItem(
        string Title,
        DateTime ReportingDate,
        int SortOrder,
        string? Notes,
        IReadOnlyList<NormalizedMdrRowItem> Rows);

    internal sealed record NormalizedMdrRowItem(
        string RowCode,
        string Description,
        string UnitCode,
        decimal PlanValue,
        decimal ForecastValue,
        decimal FactValue,
        int SortOrder,
        string? Notes);

    internal sealed record NormalizedMdrForecastFactImportItem(
        int SourceRowNumber,
        string CardTitle,
        DateTime ReportingDate,
        string RowCode,
        decimal ForecastValue,
        decimal FactValue);
}
