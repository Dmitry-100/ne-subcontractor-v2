namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureOutcomeDto(
    Guid? Id,
    Guid? WinnerContractorId,
    string? WinnerContractorName,
    DateTime? DecisionDate,
    Guid? ProtocolFileId,
    bool IsCanceled,
    string? CancellationReason,
    string? Comment);
