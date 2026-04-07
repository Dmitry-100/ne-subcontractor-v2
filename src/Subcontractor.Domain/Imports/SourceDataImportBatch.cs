using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Imports;

public sealed class SourceDataImportBatch : SoftDeletableEntity
{
    public string FileName { get; set; } = string.Empty;
    public SourceDataImportBatchStatus Status { get; set; } = SourceDataImportBatchStatus.Uploaded;
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public string? Notes { get; set; }
    public ICollection<SourceDataImportRow> Rows { get; set; } = new List<SourceDataImportRow>();
    public ICollection<SourceDataImportBatchStatusHistory> StatusHistory { get; set; } = new List<SourceDataImportBatchStatusHistory>();
}
