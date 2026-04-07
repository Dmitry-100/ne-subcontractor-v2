using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

public interface ISourceDataImportsService
{
    Task<IReadOnlyList<SourceDataImportBatchListItemDto>> ListBatchesAsync(CancellationToken cancellationToken = default);
    Task<SourceDataImportBatchDetailsDto?> GetBatchByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SourceDataImportBatchDetailsDto> CreateBatchAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default);
    Task<SourceDataImportBatchDetailsDto> CreateBatchQueuedAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default);
    Task<SourceDataImportBatchStatusHistoryItemDto?> TransitionBatchStatusAsync(
        Guid id,
        SourceDataImportBatchStatusTransitionRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>> GetBatchHistoryAsync(
        Guid id,
        CancellationToken cancellationToken = default);
    Task<SourceDataImportBatchValidationReportDto?> GetValidationReportAsync(
        Guid id,
        bool includeValidRows,
        CancellationToken cancellationToken = default);
    Task<SourceDataImportLotReconciliationReportDto?> GetLotReconciliationReportAsync(
        Guid id,
        CancellationToken cancellationToken = default);
    Task<int> ProcessQueuedBatchesAsync(
        int maxBatches = 1,
        CancellationToken cancellationToken = default);
}
