using Subcontractor.Application.Lots;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Tests.Unit.Lots;

public sealed class LotRecommendationProjectionPolicyTests
{
    [Fact]
    public void ToGroupDto_ShouldMapRows_AndAggregateTotals()
    {
        var rowId1 = Guid.NewGuid();
        var rowId2 = Guid.NewGuid();
        var group = new LotRecommendationGroup(
            GroupKey: "PRJ-001|PIPING",
            SuggestedLotCode: "LOT-PRJ-001-PIPING-01",
            SuggestedLotName: "PRJ-001 / PIPING / 2 item(s)",
            ProjectCode: "PRJ-001",
            DisciplineCode: "PIPING",
            Items:
            [
                new LotRecommendationItem(
                    SourceRowId: rowId1,
                    RowNumber: 1,
                    ProjectCode: "PRJ-001",
                    ProjectId: Guid.NewGuid(),
                    ObjectWbs: "A.01.01",
                    DisciplineCode: "PIPING",
                    ManHours: 10m,
                    PlannedStartDate: new DateTime(2026, 4, 1),
                    PlannedFinishDate: new DateTime(2026, 4, 10)),
                new LotRecommendationItem(
                    SourceRowId: rowId2,
                    RowNumber: 2,
                    ProjectCode: "PRJ-001",
                    ProjectId: Guid.NewGuid(),
                    ObjectWbs: "A.01.02",
                    DisciplineCode: "PIPING",
                    ManHours: 20m,
                    PlannedStartDate: new DateTime(2026, 4, 3),
                    PlannedFinishDate: new DateTime(2026, 4, 12))
            ]);

        var dto = LotRecommendationProjectionPolicy.ToGroupDto(group);

        Assert.Equal("PRJ-001|PIPING", dto.GroupKey);
        Assert.Equal("LOT-PRJ-001-PIPING-01", dto.SuggestedLotCode);
        Assert.Equal("PRJ-001", dto.ProjectCode);
        Assert.Equal("PIPING", dto.DisciplineCode);
        Assert.Equal(2, dto.RowsCount);
        Assert.Equal(30m, dto.TotalManHours);
        Assert.Equal(new DateTime(2026, 4, 1), dto.PlannedStartDate);
        Assert.Equal(new DateTime(2026, 4, 12), dto.PlannedFinishDate);
        Assert.Equal(2, dto.Rows.Count);
        Assert.Equal(rowId1, dto.Rows[0].SourceRowId);
        Assert.Equal(rowId2, dto.Rows[1].SourceRowId);
    }

    [Fact]
    public void CreateTraceRecord_ShouldMapFields_AndKeepLotReference()
    {
        var batchId = Guid.NewGuid();
        var applyOperationId = Guid.NewGuid();
        var lot = new Lot
        {
            Code = "LOT-001",
            Name = "Lot 001",
            Status = LotStatus.Draft
        };
        var group = new LotRecommendationGroup(
            GroupKey: "PRJ-001|PIPING",
            SuggestedLotCode: "LOT-PRJ-001-PIPING-01",
            SuggestedLotName: "PRJ-001 / PIPING / 1 item(s)",
            ProjectCode: "PRJ-001",
            DisciplineCode: "PIPING",
            Items:
            [
                new LotRecommendationItem(
                    SourceRowId: Guid.NewGuid(),
                    RowNumber: 1,
                    ProjectCode: "PRJ-001",
                    ProjectId: Guid.NewGuid(),
                    ObjectWbs: "A.01.01",
                    DisciplineCode: "PIPING",
                    ManHours: 8m,
                    PlannedStartDate: null,
                    PlannedFinishDate: null)
            ]);

        var record = LotRecommendationProjectionPolicy.CreateTraceRecord(
            batchId,
            applyOperationId,
            group,
            lotCode: "LOT-001",
            lotName: "Lot 001",
            totalManHours: 8m,
            plannedStartDate: new DateTime(2026, 5, 1),
            plannedFinishDate: new DateTime(2026, 5, 10),
            isCreated: true,
            lot,
            skipReason: null);

        Assert.Equal(batchId, record.SourceDataImportBatchId);
        Assert.Equal(applyOperationId, record.ApplyOperationId);
        Assert.Equal("PRJ-001|PIPING", record.RecommendationGroupKey);
        Assert.Equal("PRJ-001", record.ProjectCode);
        Assert.Equal("PIPING", record.DisciplineCode);
        Assert.Equal("LOT-001", record.RequestedLotCode);
        Assert.Equal("Lot 001", record.RequestedLotName);
        Assert.Equal(1, record.SourceRowsCount);
        Assert.Equal(8m, record.TotalManHours);
        Assert.Equal(new DateTime(2026, 5, 1), record.PlannedStartDate);
        Assert.Equal(new DateTime(2026, 5, 10), record.PlannedFinishDate);
        Assert.True(record.IsCreated);
        Assert.Same(lot, record.Lot);
        Assert.Null(record.SkipReason);
    }
}
