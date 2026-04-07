namespace Subcontractor.Application.Imports.Models;

public sealed class CreateXmlSourceDataImportInboxItemRequest
{
    public string SourceSystem { get; set; } = "ExpressPlanning";
    public string? ExternalDocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string XmlContent { get; set; } = string.Empty;
}
