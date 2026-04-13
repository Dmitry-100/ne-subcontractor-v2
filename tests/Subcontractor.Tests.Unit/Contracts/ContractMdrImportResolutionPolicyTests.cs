using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractMdrImportResolutionPolicyTests
{
    [Fact]
    public void Resolve_ShouldProduceUpdates_AndExpectedConflictCodes()
    {
        var normalizedItems = ContractMdrNormalizationPolicy.NormalizeMdrForecastFactImportItems(
            new[]
            {
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 1,
                    CardTitle = "Card A",
                    ReportingDate = new DateTime(2026, 4, 10),
                    RowCode = "R-1",
                    ForecastValue = 15m,
                    FactValue = 14m
                },
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 2,
                    CardTitle = "Card A",
                    ReportingDate = new DateTime(2026, 4, 10),
                    RowCode = "R-1",
                    ForecastValue = 16m,
                    FactValue = 15m
                },
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 3,
                    CardTitle = "Card B",
                    ReportingDate = new DateTime(2026, 4, 10),
                    RowCode = "R-2",
                    ForecastValue = 20m,
                    FactValue = 19m
                },
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 4,
                    CardTitle = "Card C",
                    ReportingDate = new DateTime(2026, 4, 10),
                    RowCode = "R-3",
                    ForecastValue = 30m,
                    FactValue = 29m
                }
            });

        var updatableRow = new ContractMdrRow
        {
            RowCode = "R-1",
            ForecastValue = 10m,
            FactValue = 10m
        };

        var updatableKey = ContractMdrNormalizationPolicy.BuildImportKey("Card A", new DateTime(2026, 4, 10), "R-1");
        var ambiguousKey = ContractMdrNormalizationPolicy.BuildImportKey("Card B", new DateTime(2026, 4, 10), "R-2");

        var rowIndex = new Dictionary<string, ContractMdrRow>(StringComparer.Ordinal)
        {
            [updatableKey] = updatableRow
        };
        var ambiguousKeys = new HashSet<string>(StringComparer.Ordinal)
        {
            ambiguousKey
        };

        var result = ContractMdrImportResolutionPolicy.Resolve(normalizedItems, rowIndex, ambiguousKeys);

        Assert.Single(result.Updates);
        Assert.Equal(3, result.Conflicts.Count);
        Assert.Contains(result.Conflicts, x => x.Code == "DUPLICATE_IMPORT_KEY" && x.SourceRowNumber == 2);
        Assert.Contains(result.Conflicts, x => x.Code == "AMBIGUOUS_TARGET" && x.SourceRowNumber == 3);
        Assert.Contains(result.Conflicts, x => x.Code == "TARGET_NOT_FOUND" && x.SourceRowNumber == 4);

        var changed = ContractMdrImportResolutionPolicy.ApplyUpdates(result.Updates);
        Assert.Equal(1, changed);
        Assert.Equal(15m, updatableRow.ForecastValue);
        Assert.Equal(14m, updatableRow.FactValue);
    }

    [Fact]
    public void ApplyUpdates_ShouldReturnZero_WhenValuesDidNotChange()
    {
        var row = new ContractMdrRow
        {
            RowCode = "R-1",
            ForecastValue = 15m,
            FactValue = 14m
        };

        var item = ContractMdrNormalizationPolicy.NormalizeMdrForecastFactImportItems(
            new[]
            {
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 1,
                    CardTitle = "Card A",
                    ReportingDate = new DateTime(2026, 4, 10),
                    RowCode = "R-1",
                    ForecastValue = 15m,
                    FactValue = 14m
                }
            })[0];

        var updates = new[]
        {
            new ContractMdrImportResolutionPolicy.ImportUpdate(row, item)
        };

        var changed = ContractMdrImportResolutionPolicy.ApplyUpdates(updates);

        Assert.Equal(0, changed);
        Assert.Equal(15m, row.ForecastValue);
        Assert.Equal(14m, row.FactValue);
    }
}
