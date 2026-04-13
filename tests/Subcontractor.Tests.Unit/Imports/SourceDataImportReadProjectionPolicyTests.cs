using Subcontractor.Application.Imports;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Tests.Unit.Imports;

public sealed class SourceDataImportReadProjectionPolicyTests
{
    [Fact]
    public void ToDetailsDto_ShouldSortRowsByRowNumber()
    {
        var batch = new SourceDataImportBatch
        {
            FileName = "test.xlsx",
            Status = SourceDataImportBatchStatus.Validated,
            TotalRows = 2,
            ValidRows = 1,
            InvalidRows = 1,
            Notes = "notes",
            CreatedBy = "tester"
        };

        batch.Rows.Add(new SourceDataImportRow
        {
            RowNumber = 2,
            ProjectCode = "P2",
            ObjectWbs = "OBJ-2",
            DisciplineCode = "KM",
            ManHours = 20,
            IsValid = false,
            ValidationMessage = "error",
            CreatedBy = "tester"
        });
        batch.Rows.Add(new SourceDataImportRow
        {
            RowNumber = 1,
            ProjectCode = "P1",
            ObjectWbs = "OBJ-1",
            DisciplineCode = "EM",
            ManHours = 10,
            IsValid = true,
            CreatedBy = "tester"
        });

        var dto = SourceDataImportReadProjectionPolicy.ToDetailsDto(batch);

        Assert.Equal(2, dto.Rows.Count);
        Assert.Equal(1, dto.Rows[0].RowNumber);
        Assert.Equal("P1", dto.Rows[0].ProjectCode);
        Assert.Equal(2, dto.Rows[1].RowNumber);
        Assert.Equal("P2", dto.Rows[1].ProjectCode);
    }

    [Fact]
    public void ToHistoryDto_ShouldMapValues()
    {
        var history = new SourceDataImportBatchStatusHistory
        {
            FromStatus = SourceDataImportBatchStatus.Validated,
            ToStatus = SourceDataImportBatchStatus.Rejected,
            Reason = "manual reject",
            CreatedBy = "operator",
            CreatedAtUtc = new DateTimeOffset(2026, 4, 10, 7, 30, 0, TimeSpan.Zero)
        };

        var dto = SourceDataImportReadProjectionPolicy.ToHistoryDto(history);

        Assert.Equal(SourceDataImportBatchStatus.Validated, dto.FromStatus);
        Assert.Equal(SourceDataImportBatchStatus.Rejected, dto.ToStatus);
        Assert.Equal("manual reject", dto.Reason);
        Assert.Equal("operator", dto.ChangedBy);
    }

    [Fact]
    public void BuildValidationReport_ShouldIncludeOnlyInvalidRowsWhenRequested()
    {
        var batch = new SourceDataImportBatch
        {
            FileName = "input file.csv",
            Status = SourceDataImportBatchStatus.ValidatedWithErrors,
            CreatedBy = "tester"
        };

        batch.Rows.Add(new SourceDataImportRow
        {
            RowNumber = 1,
            ProjectCode = "P1",
            ObjectWbs = "O1",
            DisciplineCode = "EM",
            ManHours = 10,
            IsValid = true,
            CreatedBy = "tester"
        });
        batch.Rows.Add(new SourceDataImportRow
        {
            RowNumber = 2,
            ProjectCode = "P2",
            ObjectWbs = "O2",
            DisciplineCode = "KM",
            ManHours = 20,
            IsValid = false,
            ValidationMessage = "bad row",
            CreatedBy = "tester"
        });

        var report = SourceDataImportReadProjectionPolicy.BuildValidationReport(batch, includeValidRows: false);

        Assert.StartsWith("input file-validation-invalid-", report.FileName);
        Assert.EndsWith($"{batch.Id:N}.csv", report.FileName);
        Assert.Contains("bad row", report.CsvContent);
        Assert.DoesNotContain(",true,", report.CsvContent);
    }

    [Fact]
    public void BuildLotReconciliationReport_ShouldBuildCsvAndEscapeValues()
    {
        var snapshot = new SourceDataImportBatchReportSnapshot(
            Guid.NewGuid(),
            "lot-report.xlsx",
            SourceDataImportBatchStatus.ReadyForLotting);

        var rows = new[]
        {
            new SourceDataImportLotReconciliationReportRow(
                ApplyOperationId: Guid.Parse("11111111-1111-1111-1111-111111111111"),
                CreatedAtUtc: new DateTimeOffset(2026, 4, 10, 8, 0, 0, TimeSpan.Zero),
                CreatedBy: "user",
                RecommendationGroupKey: "G1",
                ProjectCode: "PRJ",
                DisciplineCode: "EM",
                RequestedLotCode: "LOT-1",
                RequestedLotName: "Lot, \"Main\"",
                SourceRowsCount: 3,
                TotalManHours: 42.5m,
                PlannedStartDate: new DateTime(2026, 4, 1),
                PlannedFinishDate: new DateTime(2026, 4, 30),
                IsCreated: true,
                LotId: Guid.Parse("22222222-2222-2222-2222-222222222222"),
                SkipReason: null)
        };

        var report = SourceDataImportReadProjectionPolicy.BuildLotReconciliationReport(snapshot, rows);

        Assert.StartsWith("lot-report-lot-reconciliation-", report.FileName);
        Assert.EndsWith($"{snapshot.Id:N}.csv", report.FileName);
        Assert.Contains("\"Lot, \"\"Main\"\"\"", report.CsvContent);
        Assert.Contains("Created", report.CsvContent);
    }
}
