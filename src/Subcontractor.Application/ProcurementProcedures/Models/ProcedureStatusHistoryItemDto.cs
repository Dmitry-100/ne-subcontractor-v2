using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureStatusHistoryItemDto(
    Guid Id,
    ProcurementProcedureStatus? FromStatus,
    ProcurementProcedureStatus ToStatus,
    string Reason,
    string ChangedBy,
    DateTimeOffset ChangedAtUtc);
