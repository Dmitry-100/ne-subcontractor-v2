using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

public sealed class XmlSourceDataImportInboxWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public XmlSourceDataImportInboxWriteWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<XmlSourceDataImportInboxItemDto> QueueAsync(
        CreateXmlSourceDataImportInboxItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var fileName = XmlSourceDataImportInboxRequestPolicy.NormalizeFileName(request.FileName);
        var sourceSystem = XmlSourceDataImportInboxRequestPolicy.NormalizeSourceSystem(request.SourceSystem);
        var externalDocumentId = XmlSourceDataImportInboxRequestPolicy.NormalizeExternalDocumentId(request.ExternalDocumentId);
        var xmlContent = XmlSourceDataImportInboxRequestPolicy.NormalizeXmlContent(request.XmlContent);

        XmlSourceDataImportInboxRequestPolicy.EnsureWellFormedXml(xmlContent);

        var item = new XmlSourceDataImportInboxItem
        {
            SourceSystem = sourceSystem,
            ExternalDocumentId = externalDocumentId,
            FileName = fileName,
            XmlContent = xmlContent,
            Status = XmlSourceDataImportInboxStatus.Received
        };

        await _dbContext.Set<XmlSourceDataImportInboxItem>().AddAsync(item, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return XmlSourceDataImportInboxProjectionPolicy.ToDto(item);
    }

    public async Task<XmlSourceDataImportInboxItemDto?> RetryAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.Set<XmlSourceDataImportInboxItem>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item is null)
        {
            return null;
        }

        if (item.Status != XmlSourceDataImportInboxStatus.Failed)
        {
            throw new InvalidOperationException("Only failed XML inbox items can be retried.");
        }

        item.Status = XmlSourceDataImportInboxStatus.Received;
        item.ErrorMessage = null;
        item.SourceDataImportBatchId = null;
        item.ProcessedAtUtc = null;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return XmlSourceDataImportInboxProjectionPolicy.ToDto(item);
    }
}
