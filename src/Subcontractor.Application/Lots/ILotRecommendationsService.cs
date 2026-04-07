using Subcontractor.Application.Lots.Models;

namespace Subcontractor.Application.Lots;

public interface ILotRecommendationsService
{
    Task<LotRecommendationsDto?> BuildFromImportBatchAsync(
        Guid batchId,
        CancellationToken cancellationToken = default);

    Task<ApplyLotRecommendationsResultDto> ApplyFromImportBatchAsync(
        Guid batchId,
        ApplyLotRecommendationsRequest request,
        CancellationToken cancellationToken = default);
}
