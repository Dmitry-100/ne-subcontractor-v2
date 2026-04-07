namespace Subcontractor.Application.ContractorRatings.Models;

public sealed record ContractorRatingRecalculationResultDto(
    int ProcessedContractors,
    int UpdatedContractors,
    Guid ModelVersionId,
    string ModelVersionCode);

