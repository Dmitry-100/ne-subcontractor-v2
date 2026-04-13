using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Projects.Models;

namespace Subcontractor.Application.Projects;

public sealed class ProjectReadQueryService
{
    private const int DefaultPageSize = 15;
    private const int MaxPageSize = 200;

    private readonly IApplicationDbContext _dbContext;
    private readonly ProjectScopeResolverService _scopeResolverService;

    public ProjectReadQueryService(
        IApplicationDbContext dbContext,
        ProjectScopeResolverService scopeResolverService)
    {
        _dbContext = dbContext;
        _scopeResolverService = scopeResolverService;
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> ListAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);
        var query = ProjectReadScopePolicy.ApplyReadScope(_dbContext.Projects.AsNoTracking(), scope);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x => x.Code.Contains(normalizedSearch) || x.Name.Contains(normalizedSearch));
        }

        return await query
            .OrderBy(x => x.Code)
            .Select(x => new ProjectListItemDto(x.Id, x.Code, x.Name, x.GipUserId))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProjectListPageDto> ListPageAsync(
        string? search,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedSkip = skip < 0 ? 0 : skip;
        var normalizedTake = take <= 0 ? DefaultPageSize : Math.Min(take, MaxPageSize);

        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);
        var query = ProjectReadScopePolicy.ApplyReadScope(_dbContext.Projects.AsNoTracking(), scope);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x => x.Code.Contains(normalizedSearch) || x.Name.Contains(normalizedSearch));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.Code)
            .Skip(normalizedSkip)
            .Take(normalizedTake)
            .Select(x => new ProjectListItemDto(x.Id, x.Code, x.Name, x.GipUserId))
            .ToListAsync(cancellationToken);

        return new ProjectListPageDto(items, totalCount, normalizedSkip, normalizedTake);
    }

    public async Task<ProjectDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);

        return await ProjectReadScopePolicy.ApplyReadScope(_dbContext.Projects.AsNoTracking(), scope)
            .Where(x => x.Id == id)
            .Select(x => new ProjectDetailsDto(x.Id, x.Code, x.Name, x.GipUserId))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
