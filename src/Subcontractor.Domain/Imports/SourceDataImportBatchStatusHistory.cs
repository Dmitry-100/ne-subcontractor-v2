using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Imports;

public sealed class SourceDataImportBatchStatusHistory : AuditableEntity
{
    public Guid BatchId { get; set; }
    public SourceDataImportBatch Batch { get; set; } = null!;

    public SourceDataImportBatchStatus? FromStatus { get; set; }
    public SourceDataImportBatchStatus ToStatus { get; set; }
    public string Reason { get; set; } = string.Empty;
}
