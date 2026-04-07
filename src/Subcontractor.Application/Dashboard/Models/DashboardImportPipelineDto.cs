namespace Subcontractor.Application.Dashboard.Models;

public sealed record DashboardImportPipelineDto(
    int SourceUploadedCount,
    int SourceProcessingCount,
    int SourceReadyForLottingCount,
    int SourceValidatedWithErrorsCount,
    int SourceFailedCount,
    int SourceRejectedCount,
    int SourceInvalidRowsCount,
    int XmlReceivedCount,
    int XmlProcessingCount,
    int XmlCompletedCount,
    int XmlFailedCount,
    int XmlRetriedPendingCount,
    int TraceAppliedGroupsCount,
    int TraceCreatedGroupsCount,
    int TraceSkippedGroupsCount,
    int TraceCreatedLotsCount);
