using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ReferenceData.Models;

namespace Subcontractor.Application.ReferenceData;

public sealed class ReferenceDataReadQueryService
{
    private static readonly Func<DbContext, string, bool, IAsyncEnumerable<ReferenceDataItemDto>> CompiledListQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext, string normalizedTypeCode, bool activeOnly) =>
                dbContext.Set<Domain.ReferenceData.ReferenceDataEntry>()
                    .AsNoTracking()
                    .Where(x => x.TypeCode == normalizedTypeCode && (!activeOnly || x.IsActive))
                    .OrderBy(x => x.SortOrder)
                    .ThenBy(x => x.DisplayName)
                    .Select(x => new ReferenceDataItemDto(
                        x.TypeCode,
                        x.ItemCode,
                        x.DisplayName,
                        x.SortOrder,
                        x.IsActive)));

    private readonly IApplicationDbContext _dbContext;

    public ReferenceDataReadQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ReferenceDataItemDto>> ListAsync(
        string typeCode,
        bool activeOnly,
        CancellationToken cancellationToken = default)
    {
        var normalizedTypeCode = ReferenceDataCodePolicy.NormalizeTypeCode(typeCode);

        if (_dbContext is DbContext efDbContext)
        {
            var items = new List<ReferenceDataItemDto>();
            await foreach (var item in CompiledListQuery(efDbContext, normalizedTypeCode, activeOnly))
            {
                cancellationToken.ThrowIfCancellationRequested();
                items.Add(item);
            }

            return items;
        }

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
}
