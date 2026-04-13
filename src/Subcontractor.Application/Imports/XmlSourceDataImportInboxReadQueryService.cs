using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

public sealed class XmlSourceDataImportInboxReadQueryService
{
    private readonly IApplicationDbContext _dbContext;

    public XmlSourceDataImportInboxReadQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<XmlSourceDataImportInboxItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<XmlSourceDataImportInboxItem>()
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new XmlSourceDataImportInboxItemDto(
                x.Id,
                x.SourceSystem,
                x.ExternalDocumentId,
                x.FileName,
                x.Status,
                x.SourceDataImportBatchId,
                x.ErrorMessage,
                x.CreatedAtUtc,
                x.CreatedBy,
                x.ProcessedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<XmlSourceDataImportInboxItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.Set<XmlSourceDataImportInboxItem>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return item is null ? null : XmlSourceDataImportInboxProjectionPolicy.ToDto(item);
    }
}
