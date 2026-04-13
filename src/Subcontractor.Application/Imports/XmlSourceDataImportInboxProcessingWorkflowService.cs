using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

public sealed class XmlSourceDataImportInboxProcessingWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ISourceDataImportsService _sourceDataImportsService;
    private readonly IDateTimeProvider _dateTimeProvider;

    public XmlSourceDataImportInboxProcessingWorkflowService(
        IApplicationDbContext dbContext,
        ISourceDataImportsService sourceDataImportsService,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _sourceDataImportsService = sourceDataImportsService;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<int> ProcessQueuedAsync(int maxItems = 1, CancellationToken cancellationToken = default)
    {
        if (maxItems <= 0)
        {
            throw new ArgumentException("maxItems must be greater than zero.", nameof(maxItems));
        }

        var processedCount = 0;
        while (processedCount < maxItems && !cancellationToken.IsCancellationRequested)
        {
            var item = await _dbContext.Set<XmlSourceDataImportInboxItem>()
                .OrderBy(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync(x => x.Status == XmlSourceDataImportInboxStatus.Received, cancellationToken);
            if (item is null)
            {
                break;
            }

            try
            {
                item.Status = XmlSourceDataImportInboxStatus.Processing;
                item.ErrorMessage = null;
                await _dbContext.SaveChangesAsync(cancellationToken);

                var rows = XmlSourceDataImportXmlParserPolicy.ParseRows(item.XmlContent);
                if (rows.Count == 0)
                {
                    throw new InvalidOperationException("XML does not contain import rows.");
                }

                var createdBatch = await _sourceDataImportsService.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
                {
                    FileName = item.FileName,
                    Notes = XmlSourceDataImportInboxRequestPolicy.BuildBatchNotes(item),
                    Rows = rows
                }, cancellationToken);

                item.Status = XmlSourceDataImportInboxStatus.Completed;
                item.SourceDataImportBatchId = createdBatch.Id;
                item.ProcessedAtUtc = _dateTimeProvider.UtcNow;
                item.ErrorMessage = null;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                item.Status = XmlSourceDataImportInboxStatus.Failed;
                item.ErrorMessage = XmlSourceDataImportInboxRequestPolicy.TruncateError(ex.Message);
                item.ProcessedAtUtc = _dateTimeProvider.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            processedCount++;
        }

        return processedCount;
    }
}
