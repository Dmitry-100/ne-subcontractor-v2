using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Domain.ReferenceData;

namespace Subcontractor.Application.ReferenceData;

public sealed class ReferenceDataService : IReferenceDataService
{
    private readonly IApplicationDbContext _dbContext;

    public ReferenceDataService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ReferenceDataItemDto>> ListAsync(string typeCode, bool activeOnly, CancellationToken cancellationToken = default)
    {
        var normalizedTypeCode = NormalizeTypeCode(typeCode);
        var query = _dbContext.ReferenceDataEntries
            .AsNoTracking()
            .Where(x => x.TypeCode == normalizedTypeCode);

        if (activeOnly)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.DisplayName)
            .Select(x => new ReferenceDataItemDto(
                x.TypeCode,
                x.ItemCode,
                x.DisplayName,
                x.SortOrder,
                x.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ReferenceDataItemDto> UpsertAsync(
        string typeCode,
        UpsertReferenceDataItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedTypeCode = NormalizeTypeCode(typeCode);
        var normalizedItemCode = NormalizeItemCode(request.ItemCode);

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
                DisplayName = request.DisplayName.Trim(),
                SortOrder = request.SortOrder,
                IsActive = request.IsActive
            };

            await _dbContext.Set<ReferenceDataEntry>().AddAsync(entry, cancellationToken);
        }
        else
        {
            entry.DisplayName = request.DisplayName.Trim();
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
        var normalizedTypeCode = NormalizeTypeCode(typeCode);
        var normalizedItemCode = NormalizeItemCode(itemCode);

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

    private static string NormalizeTypeCode(string typeCode)
    {
        if (string.IsNullOrWhiteSpace(typeCode))
        {
            throw new ArgumentException("Type code is required.", nameof(typeCode));
        }

        return typeCode.Trim().ToUpperInvariant();
    }

    private static string NormalizeItemCode(string itemCode)
    {
        if (string.IsNullOrWhiteSpace(itemCode))
        {
            throw new ArgumentException("Item code is required.", nameof(itemCode));
        }

        return itemCode.Trim().ToUpperInvariant();
    }
}

