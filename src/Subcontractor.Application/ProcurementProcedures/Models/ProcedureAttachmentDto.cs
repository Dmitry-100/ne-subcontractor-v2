namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureAttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSizeBytes);
