using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Domain.ReferenceData;

namespace Subcontractor.Application.ReferenceData;

public sealed class ReferenceDataWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ReferenceDataWriteWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ReferenceDataItemDto> UpsertAsync(
        string typeCode,
        UpsertReferenceDataItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedTypeCode = ReferenceDataCodePolicy.NormalizeTypeCode(typeCode);
        var normalizedItemCode = ReferenceDataCodePolicy.NormalizeItemCode(request.ItemCode);
        var normalizedDisplayName = ReferenceDataCodePolicy.NormalizeDisplayName(request);

        var entry = await _dbContext.Set<ReferenceDataEntry>()
            .FirstOrDefaultAsync(
                x => x.TypeCode == normalizedTypeCode && x.ItemCode == normalizedItemCode,
                cancellationToken);

        if (entry is null)
        {
            entry = new ReferenceDataEntry
            {
                TypeCode = normalizedTypeCode,
                ItemCode = normalizedItemCode,
                DisplayName = normalizedDisplayName,
                SortOrder = request.SortOrder,
                IsActive = request.IsActive
            };

            await _dbContext.Set<ReferenceDataEntry>().AddAsync(entry, cancellationToken);
        }
        else
        {
            entry.DisplayName = normalizedDisplayName;
            entry.SortOrder = request.SortOrder;
            entry.IsActive = request.IsActive;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ReferenceDataItemDto(
            entry.TypeCode,
            entry.ItemCode,
            entry.DisplayName,
            entry.SortOrder,
            entry.IsActive);
    }

    public async Task<bool> DeleteAsync(string typeCode, string itemCode, CancellationToken cancellationToken = default)
    {
        var normalizedTypeCode = ReferenceDataCodePolicy.NormalizeTypeCode(typeCode);
        var normalizedItemCode = ReferenceDataCodePolicy.NormalizeItemCode(itemCode);

        var entry = await _dbContext.Set<ReferenceDataEntry>()
            .FirstOrDefaultAsync(
                x => x.TypeCode == normalizedTypeCode && x.ItemCode == normalizedItemCode,
                cancellationToken);

        if (entry is null)
        {
            return false;
        }

        _dbContext.Set<ReferenceDataEntry>().Remove(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
