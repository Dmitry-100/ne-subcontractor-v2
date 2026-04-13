using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractMonitoringControlPointNormalizationPolicyTests
{
    [Fact]
    public void NormalizeControlPointItems_ShouldReturnEmpty_WhenInputIsNull()
    {
        var result = ContractMonitoringControlPointNormalizationPolicy.NormalizeControlPointItems(null);

        Assert.Empty(result);
    }

    [Fact]
    public void NormalizeControlPointItems_ShouldThrow_WhenControlPointNameMissing()
    {
        var items = new[]
        {
            new UpsertContractMonitoringControlPointItemRequest
            {
                Name = " ",
                PlannedDate = new DateTime(2026, 4, 10),
                ProgressPercent = 10m
            }
        };

        var error = Assert.Throws<ArgumentException>(
            () => ContractMonitoringControlPointNormalizationPolicy.NormalizeControlPointItems(items));

        Assert.Equal("Control point #1: name is required.", error.Message);
    }

    [Fact]
    public void NormalizeControlPointItems_ShouldThrow_WhenStageProgressOutOfRange()
    {
        var items = new[]
        {
            new UpsertContractMonitoringControlPointItemRequest
            {
                Name = "Контрольная точка",
                PlannedDate = new DateTime(2026, 4, 10),
                ProgressPercent = 20m,
                Stages = new[]
                {
                    new UpsertContractMonitoringControlPointStageItemRequest
                    {
                        Name = "Этап 1",
                        PlannedDate = new DateTime(2026, 4, 11),
                        ProgressPercent = 120m
                    }
                }
            }
        };

        var error = Assert.Throws<ArgumentException>(
            () => ContractMonitoringControlPointNormalizationPolicy.NormalizeControlPointItems(items));

        Assert.Equal("Control point #1 stage #1: progress must be in range 0..100.", error.Message);
    }

    [Fact]
    public void NormalizeControlPointItems_ShouldNormalizeDatesRoundProgressAndClampSortOrder()
    {
        var items = new[]
        {
            new UpsertContractMonitoringControlPointItemRequest
            {
                Name = "  Контрольная точка А  ",
                ResponsibleRole = "  Технадзор  ",
                PlannedDate = new DateTime(2026, 4, 10, 15, 20, 0),
                ForecastDate = new DateTime(2026, 4, 11, 10, 0, 0),
                ActualDate = new DateTime(2026, 4, 12, 8, 10, 0),
                ProgressPercent = 33.335m,
                SortOrder = -5,
                Notes = "  note  ",
                Stages = new[]
                {
                    new UpsertContractMonitoringControlPointStageItemRequest
                    {
                        Name = "  Этап 1  ",
                        PlannedDate = new DateTime(2026, 4, 15, 11, 0, 0),
                        ForecastDate = new DateTime(2026, 4, 16, 9, 0, 0),
                        ActualDate = new DateTime(2026, 4, 17, 18, 0, 0),
                        ProgressPercent = 99.995m,
                        SortOrder = -1,
                        Notes = "  stage-note  "
                    }
                }
            }
        };

        var result = ContractMonitoringControlPointNormalizationPolicy.NormalizeControlPointItems(items);
        var point = Assert.Single(result);
        var stage = Assert.Single(point.Stages);

        Assert.Equal("Контрольная точка А", point.Name);
        Assert.Equal("Технадзор", point.ResponsibleRole);
        Assert.Equal(new DateTime(2026, 4, 10), point.PlannedDate);
        Assert.Equal(new DateTime(2026, 4, 11), point.ForecastDate);
        Assert.Equal(new DateTime(2026, 4, 12), point.ActualDate);
        Assert.Equal(33.34m, point.ProgressPercent);
        Assert.Equal(0, point.SortOrder);
        Assert.Equal("note", point.Notes);

        Assert.Equal("Этап 1", stage.Name);
        Assert.Equal(new DateTime(2026, 4, 15), stage.PlannedDate);
        Assert.Equal(new DateTime(2026, 4, 16), stage.ForecastDate);
        Assert.Equal(new DateTime(2026, 4, 17), stage.ActualDate);
        Assert.Equal(100.00m, stage.ProgressPercent);
        Assert.Equal(0, stage.SortOrder);
        Assert.Equal("stage-note", stage.Notes);
    }
}
