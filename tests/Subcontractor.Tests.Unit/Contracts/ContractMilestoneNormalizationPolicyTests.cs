using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractMilestoneNormalizationPolicyTests
{
    [Fact]
    public void NormalizeMilestoneItems_ShouldReturnEmpty_WhenInputIsNull()
    {
        var result = ContractMilestoneNormalizationPolicy.NormalizeMilestoneItems(null);

        Assert.Empty(result);
    }

    [Fact]
    public void NormalizeMilestoneItems_ShouldThrow_WhenTitleMissing()
    {
        var items = new[]
        {
            new UpsertContractMilestoneItemRequest
            {
                Title = " ",
                PlannedDate = new DateTime(2026, 4, 10),
                ProgressPercent = 10m,
                SortOrder = 0
            }
        };

        var error = Assert.Throws<ArgumentException>(() => ContractMilestoneNormalizationPolicy.NormalizeMilestoneItems(items));

        Assert.Equal("Milestone #1: title is required.", error.Message);
    }

    [Fact]
    public void NormalizeMilestoneItems_ShouldThrow_WhenProgressOutOfRange()
    {
        var items = new[]
        {
            new UpsertContractMilestoneItemRequest
            {
                Title = "Milestone",
                PlannedDate = new DateTime(2026, 4, 10),
                ProgressPercent = 101m,
                SortOrder = 0
            }
        };

        var error = Assert.Throws<ArgumentException>(() => ContractMilestoneNormalizationPolicy.NormalizeMilestoneItems(items));

        Assert.Equal("Milestone #1: progress must be in range 0..100.", error.Message);
    }

    [Fact]
    public void NormalizeMilestoneItems_ShouldThrow_WhenSortOrderNegative()
    {
        var items = new[]
        {
            new UpsertContractMilestoneItemRequest
            {
                Title = "Milestone",
                PlannedDate = new DateTime(2026, 4, 10),
                ProgressPercent = 50m,
                SortOrder = -1
            }
        };

        var error = Assert.Throws<ArgumentException>(() => ContractMilestoneNormalizationPolicy.NormalizeMilestoneItems(items));

        Assert.Equal("Milestone #1: sort order must be non-negative.", error.Message);
    }

    [Fact]
    public void NormalizeMilestoneItems_ShouldNormalizeDatesRoundProgressAndTrimNotes()
    {
        var items = new[]
        {
            new UpsertContractMilestoneItemRequest
            {
                Title = "  Stage A  ",
                PlannedDate = new DateTime(2026, 4, 10, 14, 30, 0),
                ActualDate = new DateTime(2026, 4, 11, 16, 0, 0),
                ProgressPercent = 33.335m,
                SortOrder = 2,
                Notes = "  note  "
            }
        };

        var result = ContractMilestoneNormalizationPolicy.NormalizeMilestoneItems(items);
        var item = Assert.Single(result);

        Assert.Equal("Stage A", item.Title);
        Assert.Equal(new DateTime(2026, 4, 10), item.PlannedDate);
        Assert.Equal(new DateTime(2026, 4, 11), item.ActualDate);
        Assert.Equal(33.34m, item.ProgressPercent);
        Assert.Equal(2, item.SortOrder);
        Assert.Equal("note", item.Notes);
    }
}
