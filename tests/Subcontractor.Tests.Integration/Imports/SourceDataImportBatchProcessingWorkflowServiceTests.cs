using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataImportBatchProcessingWorkflowServiceTests
{
    [Fact]
    public async Task ProcessQueuedBatchesAsync_QueuedBatch_ShouldMoveToValidatedWithErrors()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var importsService = new SourceDataImportsService(db);
        var queued = await importsService.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "queued-batch.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "Q.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 18m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "Q.01.02",
                    DisciplineCode = "ELEC",
                    ManHours = 22m
                }
            ]
        });

        var workflowService = new SourceDataImportBatchProcessingWorkflowService(db);
        var processed = await workflowService.ProcessQueuedBatchesAsync(1);

        Assert.Equal(1, processed);

        var loaded = await importsService.GetBatchByIdAsync(queued.Id);
        Assert.NotNull(loaded);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, loaded!.Status);
        Assert.Equal(2, loaded.TotalRows);
        Assert.Equal(1, loaded.ValidRows);
        Assert.Equal(1, loaded.InvalidRows);

        var history = await importsService.GetBatchHistoryAsync(queued.Id);
        Assert.Equal(3, history.Count);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, history[0].ToStatus);
        Assert.Equal(SourceDataImportBatchStatus.Processing, history[0].FromStatus);
    }

    [Fact]
    public async Task ProcessQueuedBatchesAsync_NothingInQueue_ShouldReturnZero()
    {
        await using var db = TestDbContextFactory.Create();
        var workflowService = new SourceDataImportBatchProcessingWorkflowService(db);

        var processed = await workflowService.ProcessQueuedBatchesAsync(3);

        Assert.Equal(0, processed);
    }

    [Fact]
    public async Task ProcessQueuedBatchesAsync_MaxBatchesLessOrEqualZero_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create();
        var workflowService = new SourceDataImportBatchProcessingWorkflowService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => workflowService.ProcessQueuedBatchesAsync(0));
    }
}
