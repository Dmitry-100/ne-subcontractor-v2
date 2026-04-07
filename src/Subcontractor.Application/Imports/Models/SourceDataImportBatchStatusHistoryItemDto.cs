using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports.Models;

public sealed record SourceDataImportBatchStatusHistoryItemDto(
    Guid Id,
    SourceDataImportBatchStatus? FromStatus,
    SourceDataImportBatchStatus ToStatus,
    string Reason,
    string ChangedBy,
    DateTimeOffset ChangedAtUtc);
