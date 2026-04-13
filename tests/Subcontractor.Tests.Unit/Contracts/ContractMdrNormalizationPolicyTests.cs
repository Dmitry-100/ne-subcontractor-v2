using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractMdrNormalizationPolicyTests
{
    [Fact]
    public void NormalizeMdrCardItems_ShouldReturnEmpty_WhenInputIsNull()
    {
        var result = ContractMdrNormalizationPolicy.NormalizeMdrCardItems(null);

        Assert.Empty(result);
    }

    [Fact]
    public void NormalizeMdrCardItems_ShouldThrow_WhenRowCodeMissing()
    {
        var items = new[]
        {
            new UpsertContractMdrCardItemRequest
            {
                Title = "Card A",
                ReportingDate = new DateTime(2026, 4, 10),
                Rows = new[]
                {
                    new UpsertContractMdrRowItemRequest
                    {
                        RowCode = " ",
                        Description = "Desc",
                        UnitCode = "t",
                        PlanValue = 1m,
                        ForecastValue = 1m,
                        FactValue = 1m
                    }
                }
            }
        };

        var error = Assert.Throws<ArgumentException>(() => ContractMdrNormalizationPolicy.NormalizeMdrCardItems(items));

        Assert.Equal("MDR card #1 row #1: row code is required.", error.Message);
    }

    [Fact]
    public void NormalizeMdrCardItems_ShouldNormalizeRowsAndClampSortOrder()
    {
        var items = new[]
        {
            new UpsertContractMdrCardItemRequest
            {
                Title = "  Card A  ",
                ReportingDate = new DateTime(2026, 4, 10, 9, 30, 0),
                SortOrder = -3,
                Notes = "  top-note  ",
                Rows = new[]
                {
                    new UpsertContractMdrRowItemRequest
                    {
                        RowCode = "  r-01  ",
                        Description = "  Description  ",
                        UnitCode = "  t  ",
                        PlanValue = 10.125m,
                        ForecastValue = 11.125m,
                        FactValue = 9.125m,
                        SortOrder = -2,
                        Notes = "  row-note  "
                    }
                }
            }
        };

        var result = ContractMdrNormalizationPolicy.NormalizeMdrCardItems(items);
        var card = Assert.Single(result);
        var row = Assert.Single(card.Rows);

        Assert.Equal("Card A", card.Title);
        Assert.Equal(new DateTime(2026, 4, 10), card.ReportingDate);
        Assert.Equal(0, card.SortOrder);
        Assert.Equal("top-note", card.Notes);

        Assert.Equal("r-01", row.RowCode);
        Assert.Equal("Description", row.Description);
        Assert.Equal("T", row.UnitCode);
        Assert.Equal(10.13m, row.PlanValue);
        Assert.Equal(11.13m, row.ForecastValue);
        Assert.Equal(9.13m, row.FactValue);
        Assert.Equal(0, row.SortOrder);
        Assert.Equal("row-note", row.Notes);
    }

    [Fact]
    public void NormalizeMdrForecastFactImportItems_ShouldApplyDefaultsAndNormalize()
    {
        var items = new[]
        {
            new ImportContractMdrForecastFactItemRequest
            {
                SourceRowNumber = 0,
                CardTitle = "  Card X  ",
                ReportingDate = new DateTime(2026, 4, 10, 21, 0, 0),
                RowCode = "  r-01  ",
                ForecastValue = 5.555m,
                FactValue = 4.444m
            }
        };

        var result = ContractMdrNormalizationPolicy.NormalizeMdrForecastFactImportItems(items);
        var row = Assert.Single(result);

        Assert.Equal(1, row.SourceRowNumber);
        Assert.Equal("Card X", row.CardTitle);
        Assert.Equal(new DateTime(2026, 4, 10), row.ReportingDate);
        Assert.Equal("R-01", row.RowCode);
        Assert.Equal(5.56m, row.ForecastValue);
        Assert.Equal(4.44m, row.FactValue);
    }

    [Fact]
    public void BuildImportRowIndex_ShouldTrackAmbiguousKeys()
    {
        var card1 = new ContractMdrCard
        {
            Title = "Card A",
            ReportingDate = new DateTime(2026, 4, 10),
            Rows =
            [
                new ContractMdrRow { RowCode = "r-1" },
                new ContractMdrRow { RowCode = "r-2" }
            ]
        };

        var card2 = new ContractMdrCard
        {
            Title = " card a ",
            ReportingDate = new DateTime(2026, 4, 10),
            Rows =
            [
                new ContractMdrRow { RowCode = " R-1 " }
            ]
        };

        var index = ContractMdrNormalizationPolicy.BuildImportRowIndex([card1, card2], out var ambiguousKeys);

        Assert.Contains("CARD A|2026-04-10|R-1", ambiguousKeys);
        Assert.DoesNotContain("CARD A|2026-04-10|R-1", index.Keys);
        Assert.Contains("CARD A|2026-04-10|R-2", index.Keys);
    }

    [Fact]
    public void BuildImportKey_ShouldNormalizeTokens()
    {
        var key = ContractMdrNormalizationPolicy.BuildImportKey(
            " card title ",
            new DateTime(2026, 4, 10, 9, 0, 0),
            " r-1 ");

        Assert.Equal("CARD TITLE|2026-04-10|R-1", key);
    }
}
