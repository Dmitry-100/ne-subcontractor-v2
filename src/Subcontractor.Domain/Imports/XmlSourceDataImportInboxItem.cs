using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Imports;

public sealed class XmlSourceDataImportInboxItem : SoftDeletableEntity
{
    public string SourceSystem { get; set; } = "ExpressPlanning";
    public string? ExternalDocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string XmlContent { get; set; } = string.Empty;

    public XmlSourceDataImportInboxStatus Status { get; set; } = XmlSourceDataImportInboxStatus.Received;
    public Guid? SourceDataImportBatchId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset? ProcessedAtUtc { get; set; }
}
