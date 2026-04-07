using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractStatusHistoryItemDto(
    Guid Id,
    ContractStatus? FromStatus,
    ContractStatus ToStatus,
    string Reason,
    string ChangedBy,
    DateTimeOffset ChangedAtUtc);
