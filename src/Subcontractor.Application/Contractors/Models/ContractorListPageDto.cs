namespace Subcontractor.Application.Contractors.Models;

public sealed record ContractorListPageDto(
    IReadOnlyList<ContractorListItemDto> Items,
    int TotalCount,
    int Skip,
    int Take);
