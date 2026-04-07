using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataXmlImportsControllerTests
{
    [Fact]
    public async Task Create_InvalidXml_ShouldReturnBadRequestProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Create(new CreateXmlSourceDataImportInboxItemRequest
        {
            FileName = "bad.xml",
            XmlContent = "<root>"
        }, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("Invalid XML payload", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Create_ValidXml_ShouldReturnCreatedReceivedItem()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Create(new CreateXmlSourceDataImportInboxItemRequest
        {
            SourceSystem = "ExpressPlanning",
            ExternalDocumentId = "DOC-3001",
            FileName = "doc-3001.xml",
            XmlContent = "<rows><row projectCode=\"PRJ-001\" objectWbs=\"A.01.01\" disciplineCode=\"PIPING\" manHours=\"5\" /></rows>"
        }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<XmlSourceDataImportInboxItemDto>(created.Value);
        Assert.Equal(XmlSourceDataImportInboxStatus.Received, payload.Status);
        Assert.Equal("DOC-3001", payload.ExternalDocumentId);
        Assert.Equal("doc-3001.xml", payload.FileName);
    }

    [Fact]
    public async Task Retry_WhenItemIsNotFailed_ShouldReturnConflictProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var xmlService = CreateService(db);
        var created = await xmlService.QueueAsync(new CreateXmlSourceDataImportInboxItemRequest
        {
            FileName = "not-failed.xml",
            XmlContent = "<rows><row projectCode=\"PRJ-001\" objectWbs=\"A.01.01\" disciplineCode=\"PIPING\" manHours=\"5\" /></rows>"
        });

        var controller = new SourceDataXmlImportsController(xmlService);
        var result = await controller.Retry(created.Id, CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Contains("Only failed XML inbox items can be retried", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Retry_UnknownItem_ShouldReturnNotFoundProblem()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Retry(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task List_ShouldReturnQueuedItems()
    {
        await using var db = TestDbContextFactory.Create();
        var xmlService = CreateService(db);
        await xmlService.QueueAsync(new CreateXmlSourceDataImportInboxItemRequest
        {
            FileName = "list-item.xml",
            XmlContent = "<rows><row projectCode=\"PRJ-001\" objectWbs=\"A.01.01\" disciplineCode=\"PIPING\" manHours=\"5\" /></rows>"
        });

        var controller = new SourceDataXmlImportsController(xmlService);
        var result = await controller.List(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IReadOnlyList<XmlSourceDataImportInboxItemDto>>(ok.Value);
        var item = Assert.Single(items);
        Assert.Equal(XmlSourceDataImportInboxStatus.Received, item.Status);
    }

    private static SourceDataXmlImportsController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        return new SourceDataXmlImportsController(CreateService(db));
    }

    private static IXmlSourceDataImportInboxService CreateService(Infrastructure.Persistence.AppDbContext db)
    {
        var sourceService = new SourceDataImportsService(db);
        return new XmlSourceDataImportInboxService(db, sourceService, new TestDateTimeProvider());
    }

    private sealed class TestDateTimeProvider : IDateTimeProvider
    {
        public DateTimeOffset UtcNow => new DateTimeOffset(2026, 9, 21, 10, 0, 0, TimeSpan.Zero);
    }
}
