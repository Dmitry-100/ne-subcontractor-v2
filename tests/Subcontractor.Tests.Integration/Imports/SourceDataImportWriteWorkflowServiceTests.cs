using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataImportWriteWorkflowServiceTests
{
    [Fact]
    public async Task CreateBatchAsync_WithMixedRows_ShouldReturnValidatedWithErrors()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportWriteWorkflowService(db);
        var result = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "source-data.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 120m
                },
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "A.01.02",
                    DisciplineCode = "PIPING",
                    ManHours = 50m
                }
            ]
        });

        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, result.Status);
        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(1, result.InvalidRows);
    }

    [Fact]
    public async Task CreateBatchQueuedAsync_ShouldPersistUploadedBatch()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new SourceDataImportWriteWorkflowService(db);

        var created = await service.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "queued-source-data.xlsx",
            Notes = "Queued",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "Q.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        });

        Assert.Equal(SourceDataImportBatchStatus.Uploaded, created.Status);
        Assert.Equal(1, created.TotalRows);
        Assert.Equal(0, created.ValidRows);
        Assert.Equal(0, created.InvalidRows);
    }

    [Fact]
    public async Task TransitionBatchStatusAsync_ValidatedToReadyForLotting_ShouldPersistHistory()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportWriteWorkflowService(db);
        var created = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "validated-source-data.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "C.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 25m
                }
            ]
        });

        var transitioned = await service.TransitionBatchStatusAsync(created.Id, new SourceDataImportBatchStatusTransitionRequest
        {
            TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
        });

        Assert.NotNull(transitioned);
        Assert.Equal(SourceDataImportBatchStatus.Validated, transitioned!.FromStatus);
        Assert.Equal(SourceDataImportBatchStatus.ReadyForLotting, transitioned.ToStatus);
    }
}
