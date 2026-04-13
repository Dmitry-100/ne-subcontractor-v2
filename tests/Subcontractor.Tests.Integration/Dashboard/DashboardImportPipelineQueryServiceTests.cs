using Subcontractor.Application.Dashboard;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardImportPipelineQueryServiceTests
{
    [Fact]
    public async Task BuildAsync_WithoutData_ShouldReturnEmptyPipeline()
    {
        await using var db = TestDbContextFactory.Create("dashboard-import-pipeline-user");
        var service = new DashboardImportPipelineQueryService(db);

        var pipeline = await service.BuildAsync();

        Assert.Equal(0, pipeline.SourceUploadedCount);
        Assert.Equal(0, pipeline.SourceProcessingCount);
        Assert.Equal(0, pipeline.SourceReadyForLottingCount);
        Assert.Equal(0, pipeline.SourceValidatedWithErrorsCount);
        Assert.Equal(0, pipeline.SourceFailedCount);
        Assert.Equal(0, pipeline.SourceRejectedCount);
        Assert.Equal(0, pipeline.SourceInvalidRowsCount);
        Assert.Equal(0, pipeline.XmlReceivedCount);
        Assert.Equal(0, pipeline.XmlProcessingCount);
        Assert.Equal(0, pipeline.XmlCompletedCount);
        Assert.Equal(0, pipeline.XmlFailedCount);
        Assert.Equal(0, pipeline.XmlRetriedPendingCount);
        Assert.Equal(0, pipeline.TraceAppliedGroupsCount);
        Assert.Equal(0, pipeline.TraceCreatedGroupsCount);
        Assert.Equal(0, pipeline.TraceSkippedGroupsCount);
        Assert.Equal(0, pipeline.TraceCreatedLotsCount);
    }

    [Fact]
    public async Task BuildAsync_WithData_ShouldReturnAggregatedPipelineMetrics()
    {
        var now = new DateTimeOffset(2026, 04, 06, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create("dashboard-import-pipeline-user");

        var sourceUploaded = new SourceDataImportBatch
        {
            FileName = "uploaded.csv",
            Status = SourceDataImportBatchStatus.Uploaded,
            TotalRows = 10,
            ValidRows = 10,
            InvalidRows = 0
        };
        var sourceProcessing = new SourceDataImportBatch
        {
            FileName = "processing.csv",
            Status = SourceDataImportBatchStatus.Processing,
            TotalRows = 20,
            ValidRows = 20,
            InvalidRows = 0
        };
        var sourceReady = new SourceDataImportBatch
        {
            FileName = "ready.csv",
            Status = SourceDataImportBatchStatus.ReadyForLotting,
            TotalRows = 30,
            ValidRows = 30,
            InvalidRows = 0
        };
        var sourceWithErrors = new SourceDataImportBatch
        {
            FileName = "errors.csv",
            Status = SourceDataImportBatchStatus.ValidatedWithErrors,
            TotalRows = 10,
            ValidRows = 7,
            InvalidRows = 3
        };
        var sourceFailed = new SourceDataImportBatch
        {
            FileName = "failed.csv",
            Status = SourceDataImportBatchStatus.Failed,
            TotalRows = 10,
            ValidRows = 8,
            InvalidRows = 2
        };
        var sourceRejected = new SourceDataImportBatch
        {
            FileName = "rejected.csv",
            Status = SourceDataImportBatchStatus.Rejected,
            TotalRows = 10,
            ValidRows = 6,
            InvalidRows = 4
        };

        var xmlReceived = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "received.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Received
        };
        var xmlRetriedPending = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "retry.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Received,
            LastModifiedAtUtc = now
        };
        var xmlProcessing = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "processing.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Processing
        };
        var xmlCompleted = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "completed.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Completed,
            ProcessedAtUtc = now
        };
        var xmlFailed = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "failed.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Failed,
            ErrorMessage = "Failed to parse XML.",
            ProcessedAtUtc = now
        };

        var traceLot = new Lot
        {
            Code = "LOT-TRACE-001",
            Name = "Trace lot",
            Status = LotStatus.Draft
        };

        var traceCreated = new SourceDataLotReconciliationRecord
        {
            SourceDataImportBatch = sourceReady,
            ApplyOperationId = Guid.NewGuid(),
            RecommendationGroupKey = "PRJ-READY|PIPING",
            ProjectCode = "PRJ-READY",
            DisciplineCode = "PIPING",
            RequestedLotCode = traceLot.Code,
            RequestedLotName = traceLot.Name,
            SourceRowsCount = 12,
            TotalManHours = 240m,
            PlannedStartDate = now.UtcDateTime.Date,
            PlannedFinishDate = now.UtcDateTime.Date.AddDays(7),
            IsCreated = true,
            Lot = traceLot
        };

        var traceSkipped = new SourceDataLotReconciliationRecord
        {
            SourceDataImportBatch = sourceReady,
            ApplyOperationId = Guid.NewGuid(),
            RecommendationGroupKey = "PRJ-READY|ELEC",
            ProjectCode = "PRJ-READY",
            DisciplineCode = "ELEC",
            RequestedLotCode = "LOT-TRACE-SKIP",
            RequestedLotName = "Trace lot skipped",
            SourceRowsCount = 8,
            TotalManHours = 150m,
            PlannedStartDate = now.UtcDateTime.Date.AddDays(1),
            PlannedFinishDate = now.UtcDateTime.Date.AddDays(9),
            IsCreated = false,
            SkipReason = "Already linked to existing lot."
        };

        await db.Set<SourceDataImportBatch>().AddRangeAsync(
            sourceUploaded,
            sourceProcessing,
            sourceReady,
            sourceWithErrors,
            sourceFailed,
            sourceRejected);
        await db.Set<XmlSourceDataImportInboxItem>().AddRangeAsync(
            xmlReceived,
            xmlRetriedPending,
            xmlProcessing,
            xmlCompleted,
            xmlFailed);
        await db.Set<Lot>().AddAsync(traceLot);
        await db.Set<SourceDataLotReconciliationRecord>().AddRangeAsync(traceCreated, traceSkipped);
        await db.SaveChangesAsync();

        var service = new DashboardImportPipelineQueryService(db);
        var pipeline = await service.BuildAsync();

        Assert.Equal(1, pipeline.SourceUploadedCount);
        Assert.Equal(1, pipeline.SourceProcessingCount);
        Assert.Equal(1, pipeline.SourceReadyForLottingCount);
        Assert.Equal(1, pipeline.SourceValidatedWithErrorsCount);
        Assert.Equal(1, pipeline.SourceFailedCount);
        Assert.Equal(1, pipeline.SourceRejectedCount);
        Assert.Equal(9, pipeline.SourceInvalidRowsCount);
        Assert.Equal(2, pipeline.XmlReceivedCount);
        Assert.Equal(1, pipeline.XmlProcessingCount);
        Assert.Equal(1, pipeline.XmlCompletedCount);
        Assert.Equal(1, pipeline.XmlFailedCount);
        Assert.Equal(1, pipeline.XmlRetriedPendingCount);
        Assert.Equal(2, pipeline.TraceAppliedGroupsCount);
        Assert.Equal(1, pipeline.TraceCreatedGroupsCount);
        Assert.Equal(1, pipeline.TraceSkippedGroupsCount);
        Assert.Equal(1, pipeline.TraceCreatedLotsCount);
    }
}
