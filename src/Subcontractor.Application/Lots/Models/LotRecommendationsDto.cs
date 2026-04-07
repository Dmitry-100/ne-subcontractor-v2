using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Lots.Models;

public sealed record LotRecommendationsDto(
    Guid BatchId,
    SourceDataImportBatchStatus BatchStatus,
    bool CanApply,
    string? Note,
    int CandidateRows,
    IReadOnlyList<LotRecommendationGroupDto> Groups);
