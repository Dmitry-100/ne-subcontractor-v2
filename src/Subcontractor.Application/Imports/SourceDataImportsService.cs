using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

public sealed class SourceDataImportsService : ISourceDataImportsService
{
    private readonly SourceDataImportReadQueryService _readQueryService;
    private readonly SourceDataImportBatchProcessingWorkflowService _processingWorkflowService;
    private readonly SourceDataImportWriteWorkflowService _writeWorkflowService;

    internal SourceDataImportsService(IApplicationDbContext dbContext)
        : this(
            new SourceDataImportReadQueryService(dbContext),
            new SourceDataImportBatchProcessingWorkflowService(dbContext),
            new SourceDataImportWriteWorkflowService(dbContext))
    {
    }

    internal SourceDataImportsService(
        SourceDataImportReadQueryService readQueryService,
        SourceDataImportBatchProcessingWorkflowService processingWorkflowService,
        SourceDataImportWriteWorkflowService writeWorkflowService)
    {
        _readQueryService = readQueryService;
        _processingWorkflowService = processingWorkflowService;
        _writeWorkflowService = writeWorkflowService;
    }

    public async Task<IReadOnlyList<SourceDataImportBatchListItemDto>> ListBatchesAsync(CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListBatchesAsync(cancellationToken);
    }

    public async Task<SourceDataImportBatchDetailsDto?> GetBatchByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetBatchByIdAsync(id, cancellationToken);
    }

    public async Task<SourceDataImportBatchDetailsDto> CreateBatchAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.CreateBatchAsync(request, cancellationToken);
    }

    public async Task<SourceDataImportBatchDetailsDto> CreateBatchQueuedAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.CreateBatchQueuedAsync(request, cancellationToken);
    }

    public async Task<SourceDataImportBatchStatusHistoryItemDto?> TransitionBatchStatusAsync(
        Guid id,
        SourceDataImportBatchStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.TransitionBatchStatusAsync(id, request, cancellationToken);
    }

    public async Task<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>> GetBatchHistoryAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetBatchHistoryAsync(id, cancellationToken);
    }

    public async Task<SourceDataImportBatchValidationReportDto?> GetValidationReportAsync(
        Guid id,
        bool includeValidRows,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetValidationReportAsync(id, includeValidRows, cancellationToken);
    }

    public async Task<SourceDataImportLotReconciliationReportDto?> GetLotReconciliationReportAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetLotReconciliationReportAsync(id, cancellationToken);
    }

    public async Task<int> ProcessQueuedBatchesAsync(
        int maxBatches = 1,
        CancellationToken cancellationToken = default)
    {
        return await _processingWorkflowService.ProcessQueuedBatchesAsync(maxBatches, cancellationToken);
    }
}
