using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots.Models;

public sealed record LotDetailsDto(
    Guid Id,
    string Code,
    string Name,
    LotStatus Status,
    Guid? ResponsibleCommercialUserId,
    IReadOnlyCollection<LotItemDto> Items);
