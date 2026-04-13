using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotRecommendationsControllerBranchCoverageTests
{
    [Fact]
    public async Task Endpoints_ShouldCoverSuccessBranches()
    {
        var service = new StubLotRecommendationsService();
        var controller = new LotRecommendationsController(service);
        var batchId = Guid.NewGuid();

        var build = await controller.Build(batchId, CancellationToken.None);
        var apply = await controller.Apply(batchId, new ApplyLotRecommendationsRequest(), CancellationToken.None);

        Assert.IsType<OkObjectResult>(build.Result);
        Assert.IsType<OkObjectResult>(apply.Result);
    }

    [Fact]
    public async Task Build_WhenBatchMissing_ShouldReturnNotFoundProblem()
    {
        var service = new StubLotRecommendationsService
        {
            BuildFromImportBatchAsyncHandler = (_, _) => Task.FromResult<LotRecommendationsDto?>(null)
        };
        var controller = new LotRecommendationsController(service);

        var result = await controller.Build(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Apply_WhenServiceThrowsKeyNotFoundException_ShouldReturnNotFoundProblem()
    {
        var service = new StubLotRecommendationsService
        {
            ApplyFromImportBatchAsyncHandler = (_, _, _) => throw new KeyNotFoundException("Batch was not found.")
        };
        var controller = new LotRecommendationsController(service);

        var result = await controller.Apply(Guid.NewGuid(), new ApplyLotRecommendationsRequest(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Apply_WhenServiceThrowsInvalidOperationException_ShouldReturnConflictProblem()
    {
        var service = new StubLotRecommendationsService
        {
            ApplyFromImportBatchAsyncHandler = (_, _, _) => throw new InvalidOperationException("Batch is not ready.")
        };
        var controller = new LotRecommendationsController(service);

        var result = await controller.Apply(Guid.NewGuid(), new ApplyLotRecommendationsRequest(), CancellationToken.None);

        var conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task Apply_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubLotRecommendationsService
        {
            ApplyFromImportBatchAsyncHandler = (_, _, _) => throw new ArgumentException("Empty groups payload.")
        };
        var controller = new LotRecommendationsController(service);

        var result = await controller.Apply(Guid.NewGuid(), new ApplyLotRecommendationsRequest(), CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    private static LotRecommendationsDto CreateRecommendations(Guid? batchId = null)
    {
        return new LotRecommendationsDto(
            batchId ?? Guid.NewGuid(),
            SourceDataImportBatchStatus.ReadyForLotting,
            true,
            null,
            1,
            new[]
            {
                new LotRecommendationGroupDto(
                    "GRP-001",
                    "LOT-001",
                    "Lot 001",
                    "PRJ-001",
                    "PIPING",
                    1,
                    10m,
                    null,
                    null,
                    new[]
                    {
                        new LotRecommendationRowDto(
                            Guid.NewGuid(),
                            1,
                            "PRJ-001",
                            "A.01.01",
                            "PIPING",
                            10m,
                            null,
                            null)
                    })
            });
    }

    private static ApplyLotRecommendationsResultDto CreateApplyResult(Guid? batchId = null)
    {
        return new ApplyLotRecommendationsResultDto(
            batchId ?? Guid.NewGuid(),
            1,
            new[]
            {
                new CreatedLotFromRecommendationDto(
                    "GRP-001",
                    Guid.NewGuid(),
                    "LOT-001",
                    "Lot 001",
                    1,
                    10m)
            },
            Array.Empty<SkippedLotRecommendationDto>());
    }

    private sealed class StubLotRecommendationsService : ILotRecommendationsService
    {
        public Func<Guid, CancellationToken, Task<LotRecommendationsDto?>> BuildFromImportBatchAsyncHandler { get; set; } =
            static (batchId, _) => Task.FromResult<LotRecommendationsDto?>(CreateRecommendations(batchId));

        public Func<Guid, ApplyLotRecommendationsRequest, CancellationToken, Task<ApplyLotRecommendationsResultDto>> ApplyFromImportBatchAsyncHandler { get; set; } =
            static (batchId, _, _) => Task.FromResult(CreateApplyResult(batchId));

        public Task<LotRecommendationsDto?> BuildFromImportBatchAsync(
            Guid batchId,
            CancellationToken cancellationToken = default)
            => BuildFromImportBatchAsyncHandler(batchId, cancellationToken);

        public Task<ApplyLotRecommendationsResultDto> ApplyFromImportBatchAsync(
            Guid batchId,
            ApplyLotRecommendationsRequest request,
            CancellationToken cancellationToken = default)
            => ApplyFromImportBatchAsyncHandler(batchId, request, cancellationToken);
    }
}
