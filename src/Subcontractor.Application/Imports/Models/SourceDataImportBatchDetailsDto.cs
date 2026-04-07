using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports.Models;

public sealed record SourceDataImportBatchDetailsDto(
    Guid Id,
    string FileName,
    SourceDataImportBatchStatus Status,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    string? Notes,
    DateTimeOffset CreatedAtUtc,
    string CreatedBy,
    IReadOnlyList<SourceDataImportRowDto> Rows);
