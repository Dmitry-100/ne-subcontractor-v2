using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataXmlImportsControllerBranchCoverageTests
{
    [Fact]
    public async Task Endpoints_ShouldCoverSuccessBranches()
    {
        var service = new StubXmlSourceDataImportInboxService();
        var controller = new SourceDataXmlImportsController(service);
        var itemId = Guid.NewGuid();

        var list = await controller.List(CancellationToken.None);
        var getById = await controller.GetById(itemId, CancellationToken.None);
        var create = await controller.Create(
            new CreateXmlSourceDataImportInboxItemRequest
            {
                FileName = "doc.xml",
                XmlContent = "<rows />"
            },
            CancellationToken.None);
        var retry = await controller.Retry(itemId, CancellationToken.None);

        Assert.IsType<OkObjectResult>(list.Result);
        Assert.IsType<OkObjectResult>(getById.Result);
        Assert.IsType<CreatedAtActionResult>(create.Result);
        Assert.IsType<OkObjectResult>(retry.Result);
    }

    [Fact]
    public async Task GetById_WhenItemMissing_ShouldReturnNotFoundProblem()
    {
        var service = new StubXmlSourceDataImportInboxService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<XmlSourceDataImportInboxItemDto?>(null)
        };
        var controller = new SourceDataXmlImportsController(service);

        var result = await controller.GetById(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Create_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubXmlSourceDataImportInboxService
        {
            QueueAsyncHandler = (_, _) => throw new ArgumentException("Invalid XML payload.")
        };
        var controller = new SourceDataXmlImportsController(service);

        var result = await controller.Create(
            new CreateXmlSourceDataImportInboxItemRequest
            {
                FileName = "bad.xml",
                XmlContent = "<rows>"
            },
            CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task Retry_WhenItemMissing_ShouldReturnNotFoundProblem()
    {
        var service = new StubXmlSourceDataImportInboxService
        {
            RetryAsyncHandler = (_, _) => Task.FromResult<XmlSourceDataImportInboxItemDto?>(null)
        };
        var controller = new SourceDataXmlImportsController(service);

        var result = await controller.Retry(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Retry_WhenServiceThrowsInvalidOperationException_ShouldReturnConflictProblem()
    {
        var service = new StubXmlSourceDataImportInboxService
        {
            RetryAsyncHandler = (_, _) => throw new InvalidOperationException("Only failed items can be retried.")
        };
        var controller = new SourceDataXmlImportsController(service);

        var result = await controller.Retry(Guid.NewGuid(), CancellationToken.None);

        var conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    private static XmlSourceDataImportInboxItemDto CreateItem(Guid? id = null)
    {
        return new XmlSourceDataImportInboxItemDto(
            id ?? Guid.NewGuid(),
            "ExpressPlanning",
            "DOC-001",
            "doc.xml",
            XmlSourceDataImportInboxStatus.Received,
            null,
            null,
            DateTimeOffset.UtcNow,
            "system",
            null);
    }

    private sealed class StubXmlSourceDataImportInboxService : IXmlSourceDataImportInboxService
    {
        public Func<CreateXmlSourceDataImportInboxItemRequest, CancellationToken, Task<XmlSourceDataImportInboxItemDto>> QueueAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateItem());

        public Func<CancellationToken, Task<IReadOnlyList<XmlSourceDataImportInboxItemDto>>> ListAsyncHandler { get; set; } =
            static _ => Task.FromResult<IReadOnlyList<XmlSourceDataImportInboxItemDto>>(new[] { CreateItem() });

        public Func<Guid, CancellationToken, Task<XmlSourceDataImportInboxItemDto?>> GetByIdAsyncHandler { get; set; } =
            static (id, _) => Task.FromResult<XmlSourceDataImportInboxItemDto?>(CreateItem(id));

        public Func<Guid, CancellationToken, Task<XmlSourceDataImportInboxItemDto?>> RetryAsyncHandler { get; set; } =
            static (id, _) => Task.FromResult<XmlSourceDataImportInboxItemDto?>(CreateItem(id));

        public Task<XmlSourceDataImportInboxItemDto> QueueAsync(
            CreateXmlSourceDataImportInboxItemRequest request,
            CancellationToken cancellationToken = default)
            => QueueAsyncHandler(request, cancellationToken);

        public Task<IReadOnlyList<XmlSourceDataImportInboxItemDto>> ListAsync(CancellationToken cancellationToken = default)
            => ListAsyncHandler(cancellationToken);

        public Task<XmlSourceDataImportInboxItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetByIdAsyncHandler(id, cancellationToken);

        public Task<XmlSourceDataImportInboxItemDto?> RetryAsync(Guid id, CancellationToken cancellationToken = default)
            => RetryAsyncHandler(id, cancellationToken);

        public Task<int> ProcessQueuedAsync(int maxItems = 1, CancellationToken cancellationToken = default)
            => Task.FromResult(0);
    }
}
