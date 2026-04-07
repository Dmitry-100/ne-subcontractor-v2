using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataImportsServiceTests
{
    [Fact]
    public async Task CreateBatchAsync_MixedRows_ShouldSetValidatedWithErrors()
    {
        await using var db = TestDbContextFactory.Create();
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
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 3,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "",
                    DisciplineCode = "ELEC",
                    ManHours = -5m
                }
            ]
        });

        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, result.Status);
        Assert.Equal(3, result.TotalRows);
        Assert.Equal(1, result.ValidRows);
        Assert.Equal(2, result.InvalidRows);
        Assert.Equal(3, result.Rows.Count);
        Assert.Contains(result.Rows, x => !x.IsValid && x.ValidationMessage!.Contains("does not exist", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(result.Rows, x => !x.IsValid && x.ValidationMessage!.Contains("manHours must be non-negative", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CreateBatchAsync_AllValidRows_ShouldSetValidatedStatus()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
        var created = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "valid-source-data.xlsx",
            Notes = "Pilot batch",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "B.01.02",
                    DisciplineCode = "piping",
                    ManHours = 40m,
                    PlannedStartDate = new DateTime(2026, 9, 10),
                    PlannedFinishDate = new DateTime(2026, 9, 12)
                }
            ]
        });

        Assert.Equal(SourceDataImportBatchStatus.Validated, created.Status);
        Assert.Equal(1, created.ValidRows);
        Assert.Equal(0, created.InvalidRows);
        Assert.Equal("Pilot batch", created.Notes);
        var row = Assert.Single(created.Rows);
        Assert.Equal(1, row.RowNumber);
        Assert.Equal("PRJ-001", row.ProjectCode);
        Assert.Equal("PIPING", row.DisciplineCode);
        Assert.True(row.IsValid);

        var listed = await service.ListBatchesAsync();
        var listItem = Assert.Single(listed);
        Assert.Equal(created.Id, listItem.Id);
        Assert.Equal(SourceDataImportBatchStatus.Validated, listItem.Status);

        var loaded = await service.GetBatchByIdAsync(created.Id);
        Assert.NotNull(loaded);
        Assert.Equal(created.Id, loaded!.Id);
        Assert.Single(loaded.Rows);
    }

    [Fact]
    public async Task CreateBatchAsync_WithoutRows_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new SourceDataImportsService(db);

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "empty.xlsx",
            Rows = Array.Empty<CreateSourceDataImportRowRequest>()
        }));

        Assert.Contains("At least one row is required.", error.Message);
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
        Assert.Equal(SourceDataImportBatchStatus.Validated, history[1].ToStatus);
        Assert.Null(history[1].FromStatus);
    }

    [Fact]
    public async Task TransitionBatchStatusAsync_ValidatedWithErrorsToReadyForLotting_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
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
                    DisciplineCode = "ELEC",
                    ManHours = 10m
                }
            ]
        });

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionBatchStatusAsync(
            created.Id,
            new SourceDataImportBatchStatusTransitionRequest
            {
                TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
            }));

        Assert.Contains("not allowed", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task TransitionBatchStatusAsync_ToRejectedWithoutReason_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
        var created = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "rejection-source-data.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "C.02.01",
                    DisciplineCode = "PIPING",
                    ManHours = 50m
                }
            ]
        });

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.TransitionBatchStatusAsync(
            created.Id,
            new SourceDataImportBatchStatusTransitionRequest
            {
                TargetStatus = SourceDataImportBatchStatus.Rejected
            }));

        Assert.Contains("Reason is required", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetValidationReportAsync_ShouldReturnInvalidRowsOnlyByDefault()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
        var created = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "validation-report.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "C.03.01",
                    DisciplineCode = "PIPING",
                    ManHours = 30m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "C.03.02",
                    DisciplineCode = "ELEC",
                    ManHours = 35m
                }
            ]
        });

        var invalidOnly = await service.GetValidationReportAsync(created.Id, includeValidRows: false);
        Assert.NotNull(invalidOnly);
        Assert.EndsWith(".csv", invalidOnly!.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ValidationMessage", invalidOnly.CsvContent, StringComparison.Ordinal);
        Assert.Contains("UNKNOWN", invalidOnly.CsvContent, StringComparison.Ordinal);
        Assert.DoesNotContain("C.03.01", invalidOnly.CsvContent, StringComparison.Ordinal);

        var full = await service.GetValidationReportAsync(created.Id, includeValidRows: true);
        Assert.NotNull(full);
        Assert.Contains("UNKNOWN", full!.CsvContent, StringComparison.Ordinal);
        Assert.Contains("C.03.01", full.CsvContent, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetLotReconciliationReportAsync_AfterApply_ShouldReturnCsv()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var sourceService = new SourceDataImportsService(db);
        var recommendationsService = new LotRecommendationsService(db);
        var created = await sourceService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "lot-reconciliation.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "C.04.01",
                    DisciplineCode = "PIPING",
                    ManHours = 11m
                }
            ]
        });

        await sourceService.TransitionBatchStatusAsync(created.Id, new SourceDataImportBatchStatusTransitionRequest
        {
            TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
        });

        var recommendations = await recommendationsService.BuildFromImportBatchAsync(created.Id);
        Assert.NotNull(recommendations);
        var targetGroup = Assert.Single(recommendations!.Groups);
        await recommendationsService.ApplyFromImportBatchAsync(created.Id, new ApplyLotRecommendationsRequest
        {
            Groups =
            [
                new ApplyLotRecommendationGroupRequest
                {
                    GroupKey = targetGroup.GroupKey
                }
            ]
        });

        var report = await sourceService.GetLotReconciliationReportAsync(created.Id);
        Assert.NotNull(report);
        Assert.EndsWith(".csv", report!.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ApplyOperationId", report.CsvContent, StringComparison.Ordinal);
        Assert.Contains(targetGroup.GroupKey, report.CsvContent, StringComparison.Ordinal);
        Assert.Contains("Created", report.CsvContent, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CreateBatchQueuedAsync_ShouldStoreUploadedBatch()
    {
        await using var db = TestDbContextFactory.Create();
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

    [Fact]
    public async Task ProcessQueuedBatchesAsync_ShouldValidateUploadedBatchAndUpdateStatus()
    {
        await using var db = TestDbContextFactory.Create();
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

    [Fact]
    public async Task ProcessQueuedBatchesAsync_WhenNothingQueued_ShouldReturnZero()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new SourceDataImportsService(db);

        var processed = await service.ProcessQueuedBatchesAsync(5);
        Assert.Equal(0, processed);
    }
}
