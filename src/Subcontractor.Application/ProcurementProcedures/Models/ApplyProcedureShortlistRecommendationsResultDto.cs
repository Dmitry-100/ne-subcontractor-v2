namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ApplyProcedureShortlistRecommendationsResultDto(
    int TotalCandidates,
    int IncludedCandidates,
    IReadOnlyList<ProcedureShortlistItemDto> Shortlist);
