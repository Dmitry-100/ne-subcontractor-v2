using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Imports;

[Trait("SqlSuite", "Core")]
public sealed class XmlSourceDataImportInboxSqlServiceTests
{
    [SqlFact]
    public async Task ProcessQueuedAsync_ValidXml_ShouldCreateSourceBatchAndCompleteInboxItem()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var sourceService = new SourceDataImportsService(db);
        var xmlService = new XmlSourceDataImportInboxService(db, sourceService, new FixedDateTimeProvider());

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
        Assert.Equal(new DateTimeOffset(2026, 9, 21, 10, 0, 0, TimeSpan.Zero), inbox.ProcessedAtUtc);

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

    [SqlFact]
    public async Task ProcessQueuedAsync_WhenXmlHasNoRows_ShouldFailInboxItem_AndNotCreateBatch()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var sourceService = new SourceDataImportsService(db);
        var xmlService = new XmlSourceDataImportInboxService(db, sourceService, new FixedDateTimeProvider());

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
        Assert.Null(inbox.SourceDataImportBatchId);
        Assert.Contains("does not contain import rows", inbox.ErrorMessage, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(new DateTimeOffset(2026, 9, 21, 10, 0, 0, TimeSpan.Zero), inbox.ProcessedAtUtc);

        var batchesCount = await db.Set<SourceDataImportBatch>().CountAsync();
        Assert.Equal(0, batchesCount);
    }

    [SqlFact]
    public async Task RetryAsync_FailedItem_ShouldMoveBackToReceived_AndClearErrorState()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var sourceService = new SourceDataImportsService(db);
        var xmlService = new XmlSourceDataImportInboxService(db, sourceService, new FixedDateTimeProvider());

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
        Assert.Null(retried.ProcessedAtUtc);
    }

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        public DateTimeOffset UtcNow => new DateTimeOffset(2026, 9, 21, 10, 0, 0, TimeSpan.Zero);
    }
}
