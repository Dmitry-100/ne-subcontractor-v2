using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class XmlSourceDataImportInboxServiceTests
{
    [Fact]
    public async Task QueueAsync_ValidXml_ShouldCreateReceivedInboxItem()
    {
        await using var db = TestDbContextFactory.Create();
        var sourceService = new SourceDataImportsService(db);
        var xmlService = new XmlSourceDataImportInboxService(db, sourceService, new TestDateTimeProvider());

        var created = await xmlService.QueueAsync(new CreateXmlSourceDataImportInboxItemRequest
        {
            SourceSystem = "ExpressPlanning",
            ExternalDocumentId = "DOC-1001",
            FileName = "express-1001.xml",
            XmlContent = "<rows><row projectCode=\"PRJ-001\" objectWbs=\"A.01.01\" disciplineCode=\"PIPING\" manHours=\"10\" /></rows>"
        });

        Assert.Equal(XmlSourceDataImportInboxStatus.Received, created.Status);
        Assert.Equal("ExpressPlanning", created.SourceSystem);
        Assert.Equal("DOC-1001", created.ExternalDocumentId);
        Assert.Equal("express-1001.xml", created.FileName);

        var listed = await xmlService.ListAsync();
        var item = Assert.Single(listed);
        Assert.Equal(created.Id, item.Id);
        Assert.Equal(XmlSourceDataImportInboxStatus.Received, item.Status);
    }

    [Fact]
    public async Task ProcessQueuedAsync_ValidXml_ShouldCreateSourceBatchAndCompleteInboxItem()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var sourceService = new SourceDataImportsService(db);
        var xmlService = new XmlSourceDataImportInboxService(db, sourceService, new TestDateTimeProvider());

        var queued = await xmlService.QueueAsync(new CreateXmlSourceDataImportInboxItemRequest
        {
            SourceSystem = "ExpressPlanning",
            ExternalDocumentId = "DOC-2002",
            FileName = "express-2002.xml",
            XmlContent =
                "<rows>" +
                "<row rowNumber=\"1\" projectCode=\"PRJ-001\" objectWbs=\"A.01.01\" disciplineCode=\"PIPING\" manHours=\"20\" plannedStartDate=\"2026-09-10\" plannedFinishDate=\"2026-09-20\" />" +
                "<row rowNumber=\"2\" projectCode=\"UNKNOWN\" objectWbs=\"A.01.02\" disciplineCode=\"ELEC\" manHours=\"5\" plannedStartDate=\"2026-09-21\" plannedFinishDate=\"2026-09-30\" />" +
                "</rows>"
        });

        var processed = await xmlService.ProcessQueuedAsync(1);
        Assert.Equal(1, processed);

        var inbox = await xmlService.GetByIdAsync(queued.Id);
        Assert.NotNull(inbox);
        Assert.Equal(XmlSourceDataImportInboxStatus.Completed, inbox!.Status);
        Assert.NotNull(inbox.SourceDataImportBatchId);

        var sourceBatchBeforeValidation = await sourceService.GetBatchByIdAsync(inbox.SourceDataImportBatchId!.Value);
        Assert.NotNull(sourceBatchBeforeValidation);
        Assert.Equal(SourceDataImportBatchStatus.Uploaded, sourceBatchBeforeValidation!.Status);
        Assert.Equal(2, sourceBatchBeforeValidation.TotalRows);

        await sourceService.ProcessQueuedBatchesAsync(1);

        var sourceBatchAfterValidation = await sourceService.GetBatchByIdAsync(inbox.SourceDataImportBatchId.Value);
        Assert.NotNull(sourceBatchAfterValidation);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, sourceBatchAfterValidation!.Status);
        Assert.Equal(1, sourceBatchAfterValidation.InvalidRows);
    }

    [Fact]
    public async Task ProcessQueuedAsync_WhenXmlHasNoRows_ShouldFailInboxItem()
    {
        await using var db = TestDbContextFactory.Create();
        var sourceService = new SourceDataImportsService(db);
        var xmlService = new XmlSourceDataImportInboxService(db, sourceService, new TestDateTimeProvider());

        var queued = await xmlService.QueueAsync(new CreateXmlSourceDataImportInboxItemRequest
        {
            FileName = "empty-rows.xml",
            XmlContent = "<root><meta>nothing</meta></root>"
        });

        var processed = await xmlService.ProcessQueuedAsync(1);
        Assert.Equal(1, processed);

        var inbox = await xmlService.GetByIdAsync(queued.Id);
        Assert.NotNull(inbox);
        Assert.Equal(XmlSourceDataImportInboxStatus.Failed, inbox!.Status);
        Assert.Contains("does not contain import rows", inbox.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RetryAsync_FailedItem_ShouldMoveBackToReceived()
    {
        await using var db = TestDbContextFactory.Create();
        var sourceService = new SourceDataImportsService(db);
        var xmlService = new XmlSourceDataImportInboxService(db, sourceService, new TestDateTimeProvider());

        var queued = await xmlService.QueueAsync(new CreateXmlSourceDataImportInboxItemRequest
        {
            FileName = "retry-item.xml",
            XmlContent = "<root />"
        });

        await xmlService.ProcessQueuedAsync(1);

        var retried = await xmlService.RetryAsync(queued.Id);
        Assert.NotNull(retried);
        Assert.Equal(XmlSourceDataImportInboxStatus.Received, retried!.Status);
        Assert.Null(retried.ErrorMessage);
        Assert.Null(retried.SourceDataImportBatchId);
    }

    private sealed class TestDateTimeProvider : IDateTimeProvider
    {
        public DateTimeOffset UtcNow => new DateTimeOffset(2026, 9, 21, 10, 0, 0, TimeSpan.Zero);
    }
}
