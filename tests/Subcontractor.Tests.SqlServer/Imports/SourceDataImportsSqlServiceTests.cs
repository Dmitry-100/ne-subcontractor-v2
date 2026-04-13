using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Imports;

[Trait("SqlSuite", "Core")]
public sealed class SourceDataImportsSqlServiceTests
{
    [SqlFact]
    public async Task CreateBatchAsync_MixedRows_ShouldSetValidatedWithErrors()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
        var result = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "source-data.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 120m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
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

    [SqlFact]
    public async Task TransitionBatchStatusAsync_ValidatedToReadyForLotting_ShouldPersistHistory()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
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

        var loaded = await service.GetBatchByIdAsync(created.Id);
        Assert.NotNull(loaded);
        Assert.Equal(SourceDataImportBatchStatus.ReadyForLotting, loaded!.Status);

        var history = await service.GetBatchHistoryAsync(created.Id);
        Assert.Equal(2, history.Count);
        Assert.Equal(SourceDataImportBatchStatus.ReadyForLotting, history[0].ToStatus);
        Assert.Equal(SourceDataImportBatchStatus.Validated, history[0].FromStatus);
    }

    [SqlFact]
    public async Task TransitionBatchStatusAsync_ToRejectedWithoutReason_ShouldThrowArgumentException_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
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

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.TransitionBatchStatusAsync(
            created.Id,
            new SourceDataImportBatchStatusTransitionRequest
            {
                TargetStatus = SourceDataImportBatchStatus.Rejected,
                Reason = "   "
            }));

        Assert.Equal("Reason is required for transition to Rejected. (Parameter 'reason')", error.Message);
        Assert.Equal("reason", error.ParamName);

        var loaded = await service.GetBatchByIdAsync(created.Id);
        Assert.NotNull(loaded);
        Assert.Equal(SourceDataImportBatchStatus.Validated, loaded!.Status);

        var history = await service.GetBatchHistoryAsync(created.Id);
        Assert.Single(history);
        Assert.Equal(SourceDataImportBatchStatus.Validated, history[0].ToStatus);
    }

    [SqlFact]
    public async Task TransitionBatchStatusAsync_ValidatedWithErrorsToReadyForLotting_ShouldThrowInvalidOperationException_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
        var created = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "invalid-source-data.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "C.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 25m
                },
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "C.01.02",
                    DisciplineCode = "PIPING",
                    ManHours = 30m
                }
            ]
        });

        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, created.Status);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionBatchStatusAsync(
            created.Id,
            new SourceDataImportBatchStatusTransitionRequest
            {
                TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
            }));

        Assert.Equal(
            "Transition ValidatedWithErrors -> ReadyForLotting is not allowed.",
            error.Message);

        var loaded = await service.GetBatchByIdAsync(created.Id);
        Assert.NotNull(loaded);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, loaded!.Status);

        var history = await service.GetBatchHistoryAsync(created.Id);
        Assert.Single(history);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, history[0].ToStatus);
    }

    [SqlFact]
    public async Task CreateBatchQueuedAsync_ShouldStoreUploadedBatch()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var service = new SourceDataImportsService(db);

        var created = await service.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "queued-source-data.xlsx",
            Notes = "Async import",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 4,
                    ProjectCode = "prj-queue",
                    ObjectWbs = "Q.01.01",
                    DisciplineCode = "piping",
                    ManHours = 15m
                }
            ]
        });

        Assert.Equal(SourceDataImportBatchStatus.Uploaded, created.Status);
        Assert.Equal(1, created.TotalRows);
        Assert.Equal(0, created.ValidRows);
        Assert.Equal(0, created.InvalidRows);
        Assert.Equal("Async import", created.Notes);

        var row = Assert.Single(created.Rows);
        Assert.Equal(4, row.RowNumber);
        Assert.Equal("PRJ-QUEUE", row.ProjectCode);
        Assert.True(row.IsValid);

        var history = await service.GetBatchHistoryAsync(created.Id);
        Assert.Single(history);
        Assert.Equal(SourceDataImportBatchStatus.Uploaded, history[0].ToStatus);
        Assert.Null(history[0].FromStatus);
    }

    [SqlFact]
    public async Task ProcessQueuedBatchesAsync_ShouldValidateUploadedBatchAndUpdateStatus()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
        var queued = await service.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "queued-validation.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "Q.02.01",
                    DisciplineCode = "PIPING",
                    ManHours = 20m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "Q.02.02",
                    DisciplineCode = "ELEC",
                    ManHours = 10m
                }
            ]
        });

        var processed = await service.ProcessQueuedBatchesAsync(1);
        Assert.Equal(1, processed);

        var loaded = await service.GetBatchByIdAsync(queued.Id);
        Assert.NotNull(loaded);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, loaded!.Status);
        Assert.Equal(2, loaded.TotalRows);
        Assert.Equal(1, loaded.ValidRows);
        Assert.Equal(1, loaded.InvalidRows);
        Assert.Contains(loaded.Rows, x => x.RowNumber == 2 && !x.IsValid);

        var history = await service.GetBatchHistoryAsync(queued.Id);
        Assert.Equal(3, history.Count);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, history[0].ToStatus);
        Assert.Equal(SourceDataImportBatchStatus.Processing, history[0].FromStatus);
        Assert.Equal(SourceDataImportBatchStatus.Processing, history[1].ToStatus);
        Assert.Equal(SourceDataImportBatchStatus.Uploaded, history[1].FromStatus);
        Assert.Equal(SourceDataImportBatchStatus.Uploaded, history[2].ToStatus);
        Assert.Null(history[2].FromStatus);
    }

    [SqlFact]
    public async Task ProcessQueuedBatchesAsync_WhenNothingQueued_ShouldReturnZero()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var service = new SourceDataImportsService(db);

        var processed = await service.ProcessQueuedBatchesAsync(5);
        Assert.Equal(0, processed);
    }
}
