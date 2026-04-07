using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports.Models;

public sealed record SourceDataImportBatchListItemDto(
    Guid Id,
    string FileName,
    SourceDataImportBatchStatus Status,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    DateTimeOffset CreatedAtUtc,
    string CreatedBy);
