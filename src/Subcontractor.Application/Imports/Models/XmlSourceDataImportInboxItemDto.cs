using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports.Models;

public sealed record XmlSourceDataImportInboxItemDto(
    Guid Id,
    string SourceSystem,
    string? ExternalDocumentId,
    string FileName,
    XmlSourceDataImportInboxStatus Status,
    Guid? SourceDataImportBatchId,
    string? ErrorMessage,
    DateTimeOffset CreatedAtUtc,
    string CreatedBy,
    DateTimeOffset? ProcessedAtUtc);
