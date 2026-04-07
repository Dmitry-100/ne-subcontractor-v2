namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureShortlistAdjustmentLogDto(
    Guid Id,
    Guid OperationId,
    Guid ContractorId,
    string ContractorName,
    bool? PreviousIsIncluded,
    bool NewIsIncluded,
    int? PreviousSortOrder,
    int NewSortOrder,
    string? PreviousExclusionReason,
    string? NewExclusionReason,
    string Reason,
    string ChangedBy,
    DateTimeOffset ChangedAtUtc);
