using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

public interface IXmlSourceDataImportInboxService
{
    Task<XmlSourceDataImportInboxItemDto> QueueAsync(
        CreateXmlSourceDataImportInboxItemRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<XmlSourceDataImportInboxItemDto>> ListAsync(CancellationToken cancellationToken = default);
    Task<XmlSourceDataImportInboxItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<XmlSourceDataImportInboxItemDto?> RetryAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> ProcessQueuedAsync(int maxItems = 1, CancellationToken cancellationToken = default);
}
