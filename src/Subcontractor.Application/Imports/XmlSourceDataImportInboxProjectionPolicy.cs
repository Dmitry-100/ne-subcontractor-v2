using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

internal static class XmlSourceDataImportInboxProjectionPolicy
{
    public static XmlSourceDataImportInboxItemDto ToDto(XmlSourceDataImportInboxItem item)
    {
        ArgumentNullException.ThrowIfNull(item);

        return new XmlSourceDataImportInboxItemDto(
            item.Id,
            item.SourceSystem,
            item.ExternalDocumentId,
            item.FileName,
            item.Status,
            item.SourceDataImportBatchId,
            item.ErrorMessage,
            item.CreatedAtUtc,
            item.CreatedBy,
            item.ProcessedAtUtc);
    }
}
