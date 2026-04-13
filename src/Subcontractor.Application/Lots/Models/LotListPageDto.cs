namespace Subcontractor.Application.Lots.Models;

public sealed record LotListPageDto(
    IReadOnlyList<LotListItemDto> Items,
    int TotalCount,
    int Skip,
    int Take);
