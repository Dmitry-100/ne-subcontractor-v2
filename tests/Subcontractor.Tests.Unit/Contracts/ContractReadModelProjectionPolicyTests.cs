using Subcontractor.Application.Contracts;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractReadModelProjectionPolicyTests
{
    [Fact]
    public void ToMilestoneDto_ShouldMarkOverdue_WhenPlannedDateInPastAndProgressIncomplete()
    {
        var milestone = new ContractMilestone
        {
            Title = "M1",
            PlannedDate = new DateTime(2026, 4, 9),
            ProgressPercent = 90m,
            SortOrder = 1
        };

        var dto = ContractReadModelProjectionPolicy.ToMilestoneDto(milestone, new DateTime(2026, 4, 10));

        Assert.True(dto.IsOverdue);
    }

    [Fact]
    public void ToControlPointDto_ShouldOrderStages_AndPropagateDelayedFlag()
    {
        var point = new ContractMonitoringControlPoint
        {
            Name = "CP",
            PlannedDate = new DateTime(2026, 4, 12),
            ForecastDate = new DateTime(2026, 4, 12),
            ProgressPercent = 100m,
            SortOrder = 1
        };

        point.Stages.Add(new ContractMonitoringControlPointStage
        {
            Name = "B",
            PlannedDate = new DateTime(2026, 4, 12),
            ForecastDate = new DateTime(2026, 4, 9),
            ProgressPercent = 20m,
            SortOrder = 2
        });
        point.Stages.Add(new ContractMonitoringControlPointStage
        {
            Name = "A",
            PlannedDate = new DateTime(2026, 4, 11),
            ForecastDate = new DateTime(2026, 4, 11),
            ProgressPercent = 100m,
            SortOrder = 1
        });

        var dto = ContractReadModelProjectionPolicy.ToControlPointDto(point, new DateTime(2026, 4, 10));

        Assert.True(dto.IsDelayed);
        Assert.Equal("A", dto.Stages[0].Name);
        Assert.Equal("B", dto.Stages[1].Name);
        Assert.False(dto.Stages[0].IsDelayed);
        Assert.True(dto.Stages[1].IsDelayed);
    }

    [Fact]
    public void ToMdrCardDto_ShouldCalculateTotalsAndDeviation_AndSortRows()
    {
        var card = new ContractMdrCard
        {
            Title = "Card",
            ReportingDate = new DateTime(2026, 4, 10),
            SortOrder = 0
        };

        card.Rows.Add(new ContractMdrRow
        {
            RowCode = "B",
            Description = "Row B",
            UnitCode = "t",
            PlanValue = 200m,
            ForecastValue = 210m,
            FactValue = 190m,
            SortOrder = 1
        });
        card.Rows.Add(new ContractMdrRow
        {
            RowCode = "A",
            Description = "Row A",
            UnitCode = "t",
            PlanValue = 100m,
            ForecastValue = 120m,
            FactValue = 80m,
            SortOrder = 0
        });

        var dto = ContractReadModelProjectionPolicy.ToMdrCardDto(card);

        Assert.Equal(300m, dto.TotalPlanValue);
        Assert.Equal(330m, dto.TotalForecastValue);
        Assert.Equal(270m, dto.TotalFactValue);
        Assert.Equal(10m, dto.ForecastDeviationPercent);
        Assert.Equal(-10m, dto.FactDeviationPercent);
        Assert.Equal("A", dto.Rows[0].RowCode);
        Assert.Equal("B", dto.Rows[1].RowCode);
        Assert.Equal(20m, dto.Rows[0].ForecastDeviationPercent);
        Assert.Equal(-20m, dto.Rows[0].FactDeviationPercent);
    }
}
