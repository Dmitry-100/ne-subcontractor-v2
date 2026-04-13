using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

public sealed class XmlSourceDataImportInboxService : IXmlSourceDataImportInboxService
{
    private readonly XmlSourceDataImportInboxReadQueryService _readQueryService;
    private readonly XmlSourceDataImportInboxWriteWorkflowService _writeWorkflowService;
    private readonly XmlSourceDataImportInboxProcessingWorkflowService _processingWorkflowService;

    internal XmlSourceDataImportInboxService(
        IApplicationDbContext dbContext,
        ISourceDataImportsService sourceDataImportsService,
        IDateTimeProvider dateTimeProvider)
        : this(
            new XmlSourceDataImportInboxReadQueryService(dbContext),
            new XmlSourceDataImportInboxWriteWorkflowService(dbContext),
            new XmlSourceDataImportInboxProcessingWorkflowService(
                dbContext,
                sourceDataImportsService,
                dateTimeProvider))
    {
    }

    internal XmlSourceDataImportInboxService(
        XmlSourceDataImportInboxReadQueryService readQueryService,
        XmlSourceDataImportInboxWriteWorkflowService writeWorkflowService,
        XmlSourceDataImportInboxProcessingWorkflowService processingWorkflowService)
    {
        _readQueryService = readQueryService;
        _writeWorkflowService = writeWorkflowService;
        _processingWorkflowService = processingWorkflowService;
    }

    public async Task<XmlSourceDataImportInboxItemDto> QueueAsync(
        CreateXmlSourceDataImportInboxItemRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.QueueAsync(request, cancellationToken);
    }

    public async Task<IReadOnlyList<XmlSourceDataImportInboxItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListAsync(cancellationToken);
    }

    public async Task<XmlSourceDataImportInboxItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetByIdAsync(id, cancellationToken);
    }

    public async Task<XmlSourceDataImportInboxItemDto?> RetryAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.RetryAsync(id, cancellationToken);
    }

    public async Task<int> ProcessQueuedAsync(int maxItems = 1, CancellationToken cancellationToken = default)
    {
        return await _processingWorkflowService.ProcessQueuedAsync(maxItems, cancellationToken);
    }
}
