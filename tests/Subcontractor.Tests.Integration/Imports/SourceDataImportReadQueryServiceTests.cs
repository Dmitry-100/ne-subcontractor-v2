using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataImportReadQueryServiceTests
{
    [Fact]
    public async Task GetBatchByIdAsync_UnknownBatch_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new SourceDataImportReadQueryService(db);

        var result = await service.GetBatchByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task ListBatchesAsync_AfterCreate_ShouldReturnBatches()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var importsService = new SourceDataImportsService(db);
        await importsService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "batch-1.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 12m
                }
            ]
        });
        await importsService.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "batch-2.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.02",
                    DisciplineCode = "ELEC",
                    ManHours = 5m
                }
            ]
        });

        var readQueryService = new SourceDataImportReadQueryService(db);
        var list = await readQueryService.ListBatchesAsync();

        Assert.Equal(2, list.Count);
        Assert.Contains(list, x => x.FileName == "batch-1.xlsx" && x.Status == SourceDataImportBatchStatus.Validated);
        Assert.Contains(list, x => x.FileName == "batch-2.xlsx" && x.Status == SourceDataImportBatchStatus.Uploaded);
    }

    [Fact]
    public async Task GetValidationReportAsync_WithoutValidRows_ShouldExcludeValidRows()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var importsService = new SourceDataImportsService(db);
        var batch = await importsService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "validation-report.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "B.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 20m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "B.01.02",
                    DisciplineCode = "ELEC",
                    ManHours = 14m
                }
            ]
        });

        var readQueryService = new SourceDataImportReadQueryService(db);
        var report = await readQueryService.GetValidationReportAsync(batch.Id, includeValidRows: false);

        Assert.NotNull(report);
        Assert.Contains("UNKNOWN", report!.CsvContent, StringComparison.Ordinal);
        Assert.DoesNotContain("B.01.01", report.CsvContent, StringComparison.Ordinal);
    }
}
