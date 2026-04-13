using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class XmlSourceDataImportInboxProcessingWorkflowServiceTests
{
    [Fact]
    public async Task ProcessQueuedAsync_WhenMaxItemsIsNotPositive_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create();
        var sourceService = new SourceDataImportsService(db);
        var service = new XmlSourceDataImportInboxProcessingWorkflowService(db, sourceService, new TestDateTimeProvider());

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.ProcessQueuedAsync(0, CancellationToken.None));

        Assert.Equal("maxItems", error.ParamName);
    }

    [Fact]
    public async Task ProcessQueuedAsync_WhenQueueIsEmpty_ShouldReturnZero()
    {
        await using var db = TestDbContextFactory.Create();
        var sourceService = new SourceDataImportsService(db);
        var service = new XmlSourceDataImportInboxProcessingWorkflowService(db, sourceService, new TestDateTimeProvider());

        var processed = await service.ProcessQueuedAsync(1, CancellationToken.None);

        Assert.Equal(0, processed);
    }

    [Fact]
    public async Task ProcessQueuedAsync_WhenXmlIsValid_ShouldCompleteInboxItem()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var sourceService = new SourceDataImportsService(db);
        var writeService = new XmlSourceDataImportInboxWriteWorkflowService(db);
        var readService = new XmlSourceDataImportInboxReadQueryService(db);
        var processingService = new XmlSourceDataImportInboxProcessingWorkflowService(db, sourceService, new TestDateTimeProvider());

        var queued = await writeService.QueueAsync(new CreateXmlSourceDataImportInboxItemRequest
        {
            FileName = "process-test.xml",
            XmlContent = "<rows><row rowNumber=\"1\" projectCode=\"PRJ-001\" objectWbs=\"A.01.01\" disciplineCode=\"PIPING\" manHours=\"10\" /></rows>"
        }, CancellationToken.None);

        var processed = await processingService.ProcessQueuedAsync(1, CancellationToken.None);
        var item = await readService.GetByIdAsync(queued.Id, CancellationToken.None);

        Assert.Equal(1, processed);
        Assert.NotNull(item);
        Assert.Equal(XmlSourceDataImportInboxStatus.Completed, item!.Status);
        Assert.NotNull(item.SourceDataImportBatchId);
    }

    private sealed class TestDateTimeProvider : IDateTimeProvider
    {
        public DateTimeOffset UtcNow => new DateTimeOffset(2026, 4, 11, 9, 0, 0, TimeSpan.Zero);
    }
}
