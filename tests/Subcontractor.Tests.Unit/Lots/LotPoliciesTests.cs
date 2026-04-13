using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Tests.Unit.Lots;

public sealed class LotPoliciesTests
{
    [Fact]
    public void NormalizeCode_ShouldTrimValue()
    {
        var code = LotMutationPolicy.NormalizeCode("  LOT-001  ");

        Assert.Equal("LOT-001", code);
    }

    [Fact]
    public void NormalizeItems_ShouldUppercaseDisciplineCode()
    {
        var items = LotMutationPolicy.NormalizeItems(
        [
            new UpsertLotItemRequest
            {
                ProjectId = Guid.NewGuid(),
                ObjectWbs = " A.01 ",
                DisciplineCode = " piping ",
                ManHours = 10m
            }
        ]);

        var item = Assert.Single(items);
        Assert.Equal("PIPING", item.DisciplineCode);
        Assert.Equal("A.01", item.ObjectWbs);
    }

    [Fact]
    public void NormalizeItems_WhenStartDateGreaterThanFinishDate_ShouldThrowArgumentException()
    {
        var projectId = Guid.NewGuid();
        var error = Assert.Throws<ArgumentException>(() => LotMutationPolicy.NormalizeItems(
        [
            new UpsertLotItemRequest
            {
                ProjectId = projectId,
                ObjectWbs = "A.01",
                DisciplineCode = "PIP",
                ManHours = 1m,
                PlannedStartDate = new DateTime(2026, 4, 12),
                PlannedFinishDate = new DateTime(2026, 4, 11)
            }
        ]));

        Assert.Equal("PlannedStartDate", error.ParamName);
    }

    [Fact]
    public void EnsureTransitionAllowed_WhenForwardStepIsNotSequential_ShouldThrowInvalidOperationException()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            LotTransitionPolicy.EnsureTransitionAllowed(LotStatus.Draft, LotStatus.Contracted, reason: null));

        Assert.Contains("not allowed", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ToDetailsDto_ShouldReturnItemsSortedByObjectWbsAndDiscipline()
    {
        var lot = new Lot
        {
            Code = "LOT-01",
            Name = "Test lot",
            Status = LotStatus.Draft
        };

        lot.Items.Add(new LotItem
        {
            ProjectId = Guid.NewGuid(),
            ObjectWbs = "B.02",
            DisciplineCode = "ELEC",
            ManHours = 3m
        });
        lot.Items.Add(new LotItem
        {
            ProjectId = Guid.NewGuid(),
            ObjectWbs = "A.01",
            DisciplineCode = "PIPING",
            ManHours = 5m
        });

        var dto = LotReadProjectionPolicy.ToDetailsDto(lot);
        var items = dto.Items.ToArray();

        Assert.Equal(2, items.Length);
        Assert.Equal("A.01", items[0].ObjectWbs);
        Assert.Equal("B.02", items[1].ObjectWbs);
    }
}
