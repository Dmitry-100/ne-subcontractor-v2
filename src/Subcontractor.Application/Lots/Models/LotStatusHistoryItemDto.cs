using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots.Models;

public sealed record LotStatusHistoryItemDto(
    Guid Id,
    LotStatus? FromStatus,
    LotStatus ToStatus,
    string Reason,
    string ChangedBy,
    DateTimeOffset ChangedAtUtc);
