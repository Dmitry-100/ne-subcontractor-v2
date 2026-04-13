using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

public sealed class LotReadQueryService
{
    private const int DefaultPageSize = 15;
    private const int MaxPageSize = 200;

    private readonly IApplicationDbContext _dbContext;

    public LotReadQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<LotListItemDto>> ListAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        CancellationToken cancellationToken = default)
    {
        var query = BuildFilteredQuery(search, status, projectId);
        return await ProjectListItems(query).ToListAsync(cancellationToken);
    }

    public async Task<LotListPageDto> ListPageAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedSkip = skip < 0 ? 0 : skip;
        var normalizedTake = take <= 0 ? DefaultPageSize : Math.Min(take, MaxPageSize);

        var query = BuildFilteredQuery(search, status, projectId);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await ProjectListItems(query)
            .Skip(normalizedSkip)
            .Take(normalizedTake)
            .ToListAsync(cancellationToken);

        return new LotListPageDto(items, totalCount, normalizedSkip, normalizedTake);
    }

    public async Task<LotDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var lot = await _dbContext.Set<Lot>()
            .AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return lot is null ? null : LotReadProjectionPolicy.ToDetailsDto(lot);
    }

    public async Task<IReadOnlyList<LotStatusHistoryItemDto>> GetHistoryAsync(
        Guid lotId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.LotStatusHistory
            .AsNoTracking()
            .Where(x => x.LotId == lotId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new LotStatusHistoryItemDto(
                x.Id,
                x.FromStatus,
                x.ToStatus,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    private IQueryable<Lot> BuildFilteredQuery(string? search, LotStatus? status, Guid? projectId)
    {
        var query = _dbContext.Lots
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x => x.Code.Contains(normalizedSearch) || x.Name.Contains(normalizedSearch));
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(x => x.Items.Any(i => i.ProjectId == projectId.Value));
        }

        return query;
    }

    private static IQueryable<LotListItemDto> ProjectListItems(IQueryable<Lot> query)
    {
        return query
            .OrderBy(x => x.Code)
            .Select(x => new LotListItemDto(
                x.Id,
                x.Code,
                x.Name,
                x.Status,
                x.ResponsibleCommercialUserId,
                x.Items.Count,
                x.Items.Sum(i => i.ManHours)));
    }
}
