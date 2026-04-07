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

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotRecommendationsControllerTests
{
    [Fact]
    public async Task Build_UnknownBatch_ShouldReturnNotFoundProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Build(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Build_ReadyBatch_ShouldReturnRecommendations()
    {
        await using var db = TestDbContextFactory.Create();
        var batchId = await SeedReadyBatchAsync(db);
        var controller = CreateController(db);

        var result = await controller.Build(batchId, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<LotRecommendationsDto>(ok.Value);
        Assert.Equal(batchId, payload.BatchId);
        Assert.True(payload.Groups.Count > 0);
    }

    [Fact]
    public async Task Apply_NotReadyBatch_ShouldReturnConflictProblem()
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
            FileName = "not-ready.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        });

        var controller = CreateController(db);
        var result = await controller.Apply(batch.Id, new ApplyLotRecommendationsRequest(), CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Contains("ReadyForLotting", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Apply_ReadyBatch_ShouldReturnCreatedLots()
    {
        await using var db = TestDbContextFactory.Create();
        var batchId = await SeedReadyBatchAsync(db);
        var service = new LotRecommendationsService(db);
        var recommendations = await service.BuildFromImportBatchAsync(batchId);
        Assert.NotNull(recommendations);
        var target = recommendations!.Groups.First();

        var controller = CreateController(db);
        var result = await controller.Apply(batchId, new ApplyLotRecommendationsRequest
        {
            Groups =
            [
                new ApplyLotRecommendationGroupRequest
                {
                    GroupKey = target.GroupKey
                }
            ]
        }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ApplyLotRecommendationsResultDto>(ok.Value);
        Assert.Single(payload.CreatedLots);
        Assert.Empty(payload.SkippedGroups);
    }

    private static LotRecommendationsController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        return new LotRecommendationsController(new LotRecommendationsService(db));
    }

    private static async Task<Guid> SeedReadyBatchAsync(Infrastructure.Persistence.AppDbContext db)
    {
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var importsService = new SourceDataImportsService(db);
        var batch = await importsService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "ready-batch.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.02",
                    DisciplineCode = "ELEC",
                    ManHours = 8m
                }
            ]
        });

        await importsService.TransitionBatchStatusAsync(batch.Id, new SourceDataImportBatchStatusTransitionRequest
        {
            TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
        });

        return batch.Id;
    }
}
