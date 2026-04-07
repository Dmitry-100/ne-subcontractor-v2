using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots.Models;

public sealed record LotListItemDto(
    Guid Id,
    string Code,
    string Name,
    LotStatus Status,
    Guid? ResponsibleCommercialUserId,
    int ItemsCount,
    decimal TotalManHours);
