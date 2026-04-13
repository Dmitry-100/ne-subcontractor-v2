using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataImportsControllerBranchCoverageTests
{
    [Fact]
    public async Task Endpoints_ShouldCoverSuccessBranches()
    {
        var service = new StubSourceDataImportsService();
        var controller = new SourceDataImportsController(service);
        var batchId = Guid.NewGuid();

        var list = await controller.List(CancellationToken.None);
        var getById = await controller.GetById(batchId, CancellationToken.None);
        var create = await controller.Create(new CreateSourceDataImportBatchRequest { FileName = "create.xlsx" }, CancellationToken.None);
        var createQueued = await controller.CreateQueued(new CreateSourceDataImportBatchRequest { FileName = "queued.xlsx" }, CancellationToken.None);
        var transition = await controller.Transition(
            batchId,
            new SourceDataImportBatchStatusTransitionRequest { TargetStatus = SourceDataImportBatchStatus.ReadyForLotting },
            CancellationToken.None);
        var history = await controller.History(batchId, CancellationToken.None);
        var validationReport = await controller.DownloadValidationReport(batchId, includeValidRows: true, CancellationToken.None);
        var lotReport = await controller.DownloadLotReconciliationReport(batchId, CancellationToken.None);

        Assert.IsType<OkObjectResult>(list.Result);
        Assert.IsType<OkObjectResult>(getById.Result);
        Assert.IsType<CreatedAtActionResult>(create.Result);
        Assert.IsType<CreatedAtActionResult>(createQueued.Result);
        Assert.IsType<OkObjectResult>(transition.Result);
        Assert.IsType<OkObjectResult>(history.Result);

        var validationFile = Assert.IsType<FileContentResult>(validationReport);
        Assert.Equal("text/csv", validationFile.ContentType);
        Assert.Equal("validation.csv", validationFile.FileDownloadName);
        Assert.Contains("ProjectCode", Encoding.UTF8.GetString(validationFile.FileContents), StringComparison.Ordinal);

        var lotFile = Assert.IsType<FileContentResult>(lotReport);
        Assert.Equal("text/csv", lotFile.ContentType);
        Assert.Equal("lot-report.csv", lotFile.FileDownloadName);
        Assert.Contains("LotCode", Encoding.UTF8.GetString(lotFile.FileContents), StringComparison.Ordinal);

        Assert.True(service.CapturedIncludeValidRows);
    }

    [Fact]
    public async Task GetById_WhenBatchMissing_ShouldReturnNotFoundProblem()
    {
        var service = new StubSourceDataImportsService
        {
            GetBatchByIdAsyncHandler = (_, _) => Task.FromResult<SourceDataImportBatchDetailsDto?>(null)
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.GetById(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Create_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubSourceDataImportsService
        {
            CreateBatchAsyncHandler = (_, _) => throw new ArgumentException("Invalid import batch.")
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.Create(new CreateSourceDataImportBatchRequest { FileName = "x.xlsx" }, CancellationToken.None);

        AssertBadRequest(result.Result);
    }

    [Fact]
    public async Task CreateQueued_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubSourceDataImportsService
        {
            CreateBatchQueuedAsyncHandler = (_, _) => throw new ArgumentException("Invalid queued import batch.")
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.CreateQueued(new CreateSourceDataImportBatchRequest { FileName = "x.xlsx" }, CancellationToken.None);

        AssertBadRequest(result.Result);
    }

    [Fact]
    public async Task Transition_WhenBatchMissing_ShouldReturnNotFoundProblem()
    {
        var service = new StubSourceDataImportsService
        {
            TransitionBatchStatusAsyncHandler = (_, _, _) => Task.FromResult<SourceDataImportBatchStatusHistoryItemDto?>(null)
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new SourceDataImportBatchStatusTransitionRequest { TargetStatus = SourceDataImportBatchStatus.Rejected },
            CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Transition_WhenServiceThrowsInvalidOperation_ShouldReturnConflictProblem()
    {
        var service = new StubSourceDataImportsService
        {
            TransitionBatchStatusAsyncHandler = (_, _, _) => throw new InvalidOperationException("Transition not allowed.")
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new SourceDataImportBatchStatusTransitionRequest { TargetStatus = SourceDataImportBatchStatus.Rejected },
            CancellationToken.None);

        var conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task Transition_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubSourceDataImportsService
        {
            TransitionBatchStatusAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid transition.")
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new SourceDataImportBatchStatusTransitionRequest { TargetStatus = SourceDataImportBatchStatus.Rejected },
            CancellationToken.None);

        AssertBadRequest(result.Result);
    }

    [Fact]
    public async Task DownloadValidationReport_WhenBatchMissing_ShouldReturnNotFoundProblem()
    {
        var service = new StubSourceDataImportsService
        {
            GetValidationReportAsyncHandler = (_, _, _) => Task.FromResult<SourceDataImportBatchValidationReportDto?>(null)
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.DownloadValidationReport(Guid.NewGuid(), includeValidRows: false, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task DownloadLotReconciliationReport_WhenBatchMissing_ShouldReturnNotFoundProblem()
    {
        var service = new StubSourceDataImportsService
        {
            GetLotReconciliationReportAsyncHandler = (_, _) => Task.FromResult<SourceDataImportLotReconciliationReportDto?>(null)
        };
        var controller = new SourceDataImportsController(service);

        var result = await controller.DownloadLotReconciliationReport(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    private static void AssertBadRequest(IActionResult? result)
    {
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
    }

    private static SourceDataImportBatchListItemDto CreateListItem()
    {
        return new SourceDataImportBatchListItemDto(
            Guid.NewGuid(),
            "batch.xlsx",
            SourceDataImportBatchStatus.Validated,
            1,
            1,
            0,
            DateTimeOffset.UtcNow,
            "system");
    }

    private static SourceDataImportBatchDetailsDto CreateBatchDetails(Guid? id = null)
    {
        return new SourceDataImportBatchDetailsDto(
            id ?? Guid.NewGuid(),
            "batch.xlsx",
            SourceDataImportBatchStatus.Validated,
            1,
            1,
            0,
            null,
            DateTimeOffset.UtcNow,
            "system",
            new[]
            {
                new SourceDataImportRowDto(
                    Guid.NewGuid(),
                    1,
                    "PRJ-001",
                    "A.01.01",
                    "PIPING",
                    10m,
                    null,
                    null,
                    true,
                    null)
            });
    }

    private static SourceDataImportBatchStatusHistoryItemDto CreateHistoryItem()
    {
        return new SourceDataImportBatchStatusHistoryItemDto(
            Guid.NewGuid(),
            SourceDataImportBatchStatus.Uploaded,
            SourceDataImportBatchStatus.Validated,
            "auto validation",
            "system",
            DateTimeOffset.UtcNow);
    }

    private sealed class StubSourceDataImportsService : ISourceDataImportsService
    {
        public bool CapturedIncludeValidRows { get; private set; }

        public Func<CancellationToken, Task<IReadOnlyList<SourceDataImportBatchListItemDto>>> ListBatchesAsyncHandler { get; set; } =
            static _ => Task.FromResult<IReadOnlyList<SourceDataImportBatchListItemDto>>(new[] { CreateListItem() });

        public Func<Guid, CancellationToken, Task<SourceDataImportBatchDetailsDto?>> GetBatchByIdAsyncHandler { get; set; } =
            static (id, _) => Task.FromResult<SourceDataImportBatchDetailsDto?>(CreateBatchDetails(id));

        public Func<CreateSourceDataImportBatchRequest, CancellationToken, Task<SourceDataImportBatchDetailsDto>> CreateBatchAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateBatchDetails());

        public Func<CreateSourceDataImportBatchRequest, CancellationToken, Task<SourceDataImportBatchDetailsDto>> CreateBatchQueuedAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateBatchDetails());

        public Func<Guid, SourceDataImportBatchStatusTransitionRequest, CancellationToken, Task<SourceDataImportBatchStatusHistoryItemDto?>> TransitionBatchStatusAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<SourceDataImportBatchStatusHistoryItemDto?>(CreateHistoryItem());

        public Func<Guid, CancellationToken, Task<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>>> GetBatchHistoryAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>>(new[] { CreateHistoryItem() });

        public Func<Guid, bool, CancellationToken, Task<SourceDataImportBatchValidationReportDto?>> GetValidationReportAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<SourceDataImportBatchValidationReportDto?>(
                new SourceDataImportBatchValidationReportDto("validation.csv", "ProjectCode,ObjectWbs\nPRJ-001,A.01.01"));

        public Func<Guid, CancellationToken, Task<SourceDataImportLotReconciliationReportDto?>> GetLotReconciliationReportAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<SourceDataImportLotReconciliationReportDto?>(
                new SourceDataImportLotReconciliationReportDto("lot-report.csv", "LotCode,Status\nLOT-001,Created"));

        public Task<IReadOnlyList<SourceDataImportBatchListItemDto>> ListBatchesAsync(CancellationToken cancellationToken = default)
            => ListBatchesAsyncHandler(cancellationToken);

        public Task<SourceDataImportBatchDetailsDto?> GetBatchByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetBatchByIdAsyncHandler(id, cancellationToken);

        public Task<SourceDataImportBatchDetailsDto> CreateBatchAsync(
            CreateSourceDataImportBatchRequest request,
            CancellationToken cancellationToken = default)
            => CreateBatchAsyncHandler(request, cancellationToken);

        public Task<SourceDataImportBatchDetailsDto> CreateBatchQueuedAsync(
            CreateSourceDataImportBatchRequest request,
            CancellationToken cancellationToken = default)
            => CreateBatchQueuedAsyncHandler(request, cancellationToken);

        public Task<SourceDataImportBatchStatusHistoryItemDto?> TransitionBatchStatusAsync(
            Guid id,
            SourceDataImportBatchStatusTransitionRequest request,
            CancellationToken cancellationToken = default)
            => TransitionBatchStatusAsyncHandler(id, request, cancellationToken);

        public Task<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>> GetBatchHistoryAsync(
            Guid id,
            CancellationToken cancellationToken = default)
            => GetBatchHistoryAsyncHandler(id, cancellationToken);

        public Task<SourceDataImportBatchValidationReportDto?> GetValidationReportAsync(
            Guid id,
            bool includeValidRows,
            CancellationToken cancellationToken = default)
        {
            CapturedIncludeValidRows = includeValidRows;
            return GetValidationReportAsyncHandler(id, includeValidRows, cancellationToken);
        }

        public Task<SourceDataImportLotReconciliationReportDto?> GetLotReconciliationReportAsync(
            Guid id,
            CancellationToken cancellationToken = default)
            => GetLotReconciliationReportAsyncHandler(id, cancellationToken);

        public Task<int> ProcessQueuedBatchesAsync(int maxBatches = 1, CancellationToken cancellationToken = default)
            => Task.FromResult(0);
    }
}
