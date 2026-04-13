using System.Xml.Linq;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

internal static class XmlSourceDataImportInboxRequestPolicy
{
    public static string NormalizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new ArgumentException("File name is required.", nameof(fileName));
        }

        return fileName.Trim();
    }

    public static string NormalizeSourceSystem(string sourceSystem)
    {
        var normalized = sourceSystem?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? "ExpressPlanning" : normalized;
    }

    public static string? NormalizeExternalDocumentId(string? externalDocumentId)
    {
        var normalized = externalDocumentId?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    public static string NormalizeXmlContent(string xmlContent)
    {
        if (string.IsNullOrWhiteSpace(xmlContent))
        {
            throw new ArgumentException("XML content is required.", nameof(xmlContent));
        }

        return xmlContent.Trim();
    }

    public static void EnsureWellFormedXml(string xmlContent)
    {
        try
        {
            _ = XDocument.Parse(xmlContent, LoadOptions.None);
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"Invalid XML payload: {ex.Message}", nameof(xmlContent));
        }
    }

    public static string? BuildBatchNotes(XmlSourceDataImportInboxItem item)
    {
        ArgumentNullException.ThrowIfNull(item);

        var notes = new List<string>
        {
            $"XML SourceSystem: {item.SourceSystem}"
        };

        if (!string.IsNullOrWhiteSpace(item.ExternalDocumentId))
        {
            notes.Add($"ExternalDocumentId: {item.ExternalDocumentId}");
        }

        return string.Join("; ", notes);
    }

    public static string TruncateError(string? message)
    {
        var normalized = string.IsNullOrWhiteSpace(message) ? "XML processing failed." : message.Trim();
        return normalized.Length <= 2000 ? normalized : normalized[..2000];
    }
}
