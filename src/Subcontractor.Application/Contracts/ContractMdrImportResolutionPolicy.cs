using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

internal static class ContractMdrImportResolutionPolicy
{
    public static ResolutionResult Resolve(
        IReadOnlyCollection<ContractMdrNormalizationPolicy.NormalizedMdrForecastFactImportItem> normalizedItems,
        IReadOnlyDictionary<string, ContractMdrRow> rowIndex,
        ISet<string> ambiguousKeys)
    {
        var conflicts = new List<ImportContractMdrForecastFactConflictDto>();
        var uniqueImportKeys = new HashSet<string>(StringComparer.Ordinal);
        var updates = new List<ImportUpdate>();

        foreach (var item in normalizedItems)
        {
            var key = ContractMdrNormalizationPolicy.BuildImportKey(item.CardTitle, item.ReportingDate, item.RowCode);
            if (!uniqueImportKeys.Add(key))
            {
                conflicts.Add(new ImportContractMdrForecastFactConflictDto(
                    item.SourceRowNumber,
                    "DUPLICATE_IMPORT_KEY",
                    "Duplicate key in import payload.",
                    item.CardTitle,
                    item.ReportingDate,
                    item.RowCode));
                continue;
            }

            if (ambiguousKeys.Contains(key))
            {
                conflicts.Add(new ImportContractMdrForecastFactConflictDto(
                    item.SourceRowNumber,
                    "AMBIGUOUS_TARGET",
                    "Multiple MDR rows match the same key in the current contract data.",
                    item.CardTitle,
                    item.ReportingDate,
                    item.RowCode));
                continue;
            }

            if (!rowIndex.TryGetValue(key, out var row))
            {
                conflicts.Add(new ImportContractMdrForecastFactConflictDto(
                    item.SourceRowNumber,
                    "TARGET_NOT_FOUND",
                    "Matching MDR row was not found for key CardTitle + ReportingDate + RowCode.",
                    item.CardTitle,
                    item.ReportingDate,
                    item.RowCode));
                continue;
            }

            updates.Add(new ImportUpdate(row, item));
        }

        return new ResolutionResult(conflicts, updates);
    }

    public static int ApplyUpdates(IReadOnlyCollection<ImportUpdate> updates)
    {
        var updatedRows = 0;
        foreach (var update in updates)
        {
            var nextForecast = update.Item.ForecastValue;
            var nextFact = update.Item.FactValue;
            if (update.Row.ForecastValue != nextForecast || update.Row.FactValue != nextFact)
            {
                update.Row.ForecastValue = nextForecast;
                update.Row.FactValue = nextFact;
                updatedRows++;
            }
        }

        return updatedRows;
    }

    internal sealed record ImportUpdate(
        ContractMdrRow Row,
        ContractMdrNormalizationPolicy.NormalizedMdrForecastFactImportItem Item);

    internal sealed record ResolutionResult(
        IReadOnlyList<ImportContractMdrForecastFactConflictDto> Conflicts,
        IReadOnlyList<ImportUpdate> Updates);
}
