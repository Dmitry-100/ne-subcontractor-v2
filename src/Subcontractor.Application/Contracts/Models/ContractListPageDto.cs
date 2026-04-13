namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractListPageDto(
    IReadOnlyList<ContractListItemDto> Items,
    int TotalCount,
    int Skip,
    int Take);
