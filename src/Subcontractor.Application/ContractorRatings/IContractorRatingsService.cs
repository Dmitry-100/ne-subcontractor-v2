using Subcontractor.Application.ContractorRatings.Models;

namespace Subcontractor.Application.ContractorRatings;

public interface IContractorRatingsService
{
    Task<ContractorRatingModelDto> GetActiveModelAsync(CancellationToken cancellationToken = default);

    Task<ContractorRatingModelDto> UpsertActiveModelAsync(
        UpsertContractorRatingModelRequest request,
        CancellationToken cancellationToken = default);

    Task<ContractorRatingManualAssessmentDto> UpsertManualAssessmentAsync(
        Guid contractorId,
        UpsertContractorRatingManualAssessmentRequest request,
        CancellationToken cancellationToken = default);

    Task<ContractorRatingRecalculationResultDto> RecalculateRatingsAsync(
        RecalculateContractorRatingsRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ContractorRatingHistoryItemDto>> GetHistoryAsync(
        Guid contractorId,
        int top = 50,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ContractorRatingAnalyticsRowDto>> GetAnalyticsAsync(
        CancellationToken cancellationToken = default);
}

