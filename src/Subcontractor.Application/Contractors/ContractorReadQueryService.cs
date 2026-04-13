using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.Contractors;

public sealed class ContractorReadQueryService
{
    private const int DefaultPageSize = 15;
    private const int MaxPageSize = 200;

    private readonly IApplicationDbContext _dbContext;

    public ContractorReadQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ContractorListItemDto>> ListAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var query = BuildFilteredQuery(search);
        return await ProjectListItems(query).ToListAsync(cancellationToken);
    }

    public async Task<ContractorListPageDto> ListPageAsync(
        string? search,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedSkip = skip < 0 ? 0 : skip;
        var normalizedTake = take <= 0 ? DefaultPageSize : Math.Min(take, MaxPageSize);

        var query = BuildFilteredQuery(search);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await ProjectListItems(query)
            .Skip(normalizedSkip)
            .Take(normalizedTake)
            .ToListAsync(cancellationToken);

        return new ContractorListPageDto(items, totalCount, normalizedSkip, normalizedTake);
    }

    public async Task<ContractorDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contractor = await _dbContext.Set<Contractor>()
            .AsNoTracking()
            .Include(x => x.Qualifications)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return contractor is null ? null : ContractorReadProjectionPolicy.ToDetailsDto(contractor);
    }

    private IQueryable<Contractor> BuildFilteredQuery(string? search)
    {
        var query = _dbContext.Contractors.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.Name.Contains(normalizedSearch) ||
                x.Inn.Contains(normalizedSearch) ||
                x.City.Contains(normalizedSearch));
        }

        return query;
    }

    private static IQueryable<ContractorListItemDto> ProjectListItems(IQueryable<Contractor> query)
    {
        return query
            .OrderBy(x => x.Name)
            .Select(x => new ContractorListItemDto(
                x.Id,
                x.Inn,
                x.Name,
                x.City,
                x.Status,
                x.ReliabilityClass,
                x.CurrentRating,
                x.CurrentLoadPercent));
    }
}
