using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataImportsControllerTests
{
    [Fact]
    public async Task GetById_UnknownBatch_ShouldReturnNotFoundProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.GetById(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
        Assert.Equal("Resource not found.", problem.Title);
    }

    [Fact]
    public async Task Create_WithEmptyFileName_ShouldReturnBadRequestProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Create(new CreateSourceDataImportBatchRequest
        {
            FileName = " ",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        }, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("File name is required", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Create_ValidRequest_ShouldReturnCreatedBatch()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.Create(new CreateSourceDataImportBatchRequest
        {
            FileName = "pilot-import.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 7,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<SourceDataImportBatchDetailsDto>(created.Value);
        Assert.Equal(SourceDataImportBatchStatus.Validated, payload.Status);
        Assert.Equal(1, payload.ValidRows);
        Assert.Equal(0, payload.InvalidRows);
        var row = Assert.Single(payload.Rows);
        Assert.Equal(7, row.RowNumber);
    }

    [Fact]
    public async Task CreateQueued_ValidRequest_ShouldReturnUploadedBatch()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.CreateQueued(new CreateSourceDataImportBatchRequest
        {
            FileName = "queued-import.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 3,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.03.01",
                    DisciplineCode = "PIPING",
                    ManHours = 12m
                }
            ]
        }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<SourceDataImportBatchDetailsDto>(created.Value);
        Assert.Equal(SourceDataImportBatchStatus.Uploaded, payload.Status);
        Assert.Equal(1, payload.TotalRows);
        Assert.Equal(0, payload.ValidRows);
        Assert.Equal(0, payload.InvalidRows);
    }

    [Fact]
    public async Task DownloadTemplate_ShouldReturnCsvFile()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = controller.DownloadTemplate();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
        Assert.Equal("source-data-template.csv", file.FileDownloadName);
        var content = Encoding.UTF8.GetString(file.FileContents);
        Assert.Contains("ProjectCode", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("PlannedFinishDate", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Transition_UnknownBatch_ShouldReturnNotFoundProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new SourceDataImportBatchStatusTransitionRequest
            {
                TargetStatus = SourceDataImportBatchStatus.Rejected,
                Reason = "manual reject"
            },
            CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
        Assert.Equal("Resource not found.", problem.Title);
    }

    [Fact]
    public async Task Transition_InvalidRoute_ShouldReturnConflictProblem()
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
            FileName = "invalid-transition.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        });

        var controller = new SourceDataImportsController(service);
        var result = await controller.Transition(
            created.Id,
            new SourceDataImportBatchStatusTransitionRequest
            {
                TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
            },
            CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Contains("not allowed", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Transition_FromUploaded_ShouldReturnConflictProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new SourceDataImportsService(db);
        var created = await service.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "queued-transition.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.04.01",
                    DisciplineCode = "PIPING",
                    ManHours = 8m
                }
            ]
        });

        var controller = new SourceDataImportsController(service);
        var result = await controller.Transition(
            created.Id,
            new SourceDataImportBatchStatusTransitionRequest
            {
                TargetStatus = SourceDataImportBatchStatus.Rejected,
                Reason = "manual reject"
            },
            CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Contains("not allowed", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DownloadValidationReport_ValidBatch_ShouldReturnCsvFile()
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
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                },
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "A.01.02",
                    DisciplineCode = "ELEC",
                    ManHours = 20m
                }
            ]
        });

        var controller = new SourceDataImportsController(service);
        var result = await controller.DownloadValidationReport(created.Id, includeValidRows: false, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
        Assert.EndsWith(".csv", file.FileDownloadName, StringComparison.OrdinalIgnoreCase);
        var content = Encoding.UTF8.GetString(file.FileContents);
        Assert.Contains("UNKNOWN", content, StringComparison.Ordinal);
        Assert.DoesNotContain("A.01.01", content, StringComparison.Ordinal);
    }

    [Fact]
    public async Task DownloadLotReconciliationReport_AfterApply_ShouldReturnCsvFile()
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
            FileName = "lot-trace-report.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.05.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        });
        await sourceService.TransitionBatchStatusAsync(created.Id, new SourceDataImportBatchStatusTransitionRequest
        {
            TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
        });

        var recommendations = await recommendationsService.BuildFromImportBatchAsync(created.Id);
        Assert.NotNull(recommendations);
        var group = Assert.Single(recommendations!.Groups);
        await recommendationsService.ApplyFromImportBatchAsync(created.Id, new ApplyLotRecommendationsRequest
        {
            Groups =
            [
                new ApplyLotRecommendationGroupRequest
                {
                    GroupKey = group.GroupKey
                }
            ]
        });

        var controller = new SourceDataImportsController(sourceService);
        var result = await controller.DownloadLotReconciliationReport(created.Id, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
        Assert.EndsWith(".csv", file.FileDownloadName, StringComparison.OrdinalIgnoreCase);
        var content = Encoding.UTF8.GetString(file.FileContents);
        Assert.Contains("ApplyOperationId", content, StringComparison.Ordinal);
        Assert.Contains("Created", content, StringComparison.Ordinal);
    }

    [Fact]
    public async Task History_AfterTransition_ShouldReturnEntries()
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
            FileName = "history-report.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.02.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        });

        await service.TransitionBatchStatusAsync(created.Id, new SourceDataImportBatchStatusTransitionRequest
        {
            TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
        });

        var controller = new SourceDataImportsController(service);
        var result = await controller.History(created.Id, CancellationToken.None);

        var payload = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>>(payload.Value);
        Assert.Equal(2, items.Count);
        Assert.Equal(SourceDataImportBatchStatus.ReadyForLotting, items[0].ToStatus);
    }

    private static SourceDataImportsController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var service = new SourceDataImportsService(db);
        return new SourceDataImportsController(service);
    }
}
