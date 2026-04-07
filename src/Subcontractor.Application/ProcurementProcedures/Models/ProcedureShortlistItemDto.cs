namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureShortlistItemDto(
    Guid Id,
    Guid ContractorId,
    string ContractorName,
    bool IsIncluded,
    int SortOrder,
    string? ExclusionReason,
    string? Notes);
