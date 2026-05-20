using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Imports;

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

    public async Task<ProjectSourceDataPageDto> ListLatestSourceDataPageAsync(
        string? search,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedSkip = skip < 0 ? 0 : skip;
        var normalizedTake = take <= 0 ? DefaultPageSize : Math.Min(take, MaxPageSize);

        var latestBatch = await _dbContext.SourceDataImportBatches
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Id)
            .Select(x => new SourceDataBatchSnapshot(
                x.Id,
                x.FileName,
                x.Status,
                x.CreatedAtUtc))
            .FirstOrDefaultAsync(cancellationToken);

        if (latestBatch is null)
        {
            return new ProjectSourceDataPageDto(
                null,
                null,
                null,
                null,
                Array.Empty<ProjectSourceDataRowDto>(),
                0,
                normalizedSkip,
                normalizedTake);
        }

        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);
        var query = _dbContext.SourceDataImportRows
            .AsNoTracking()
            .Where(x => x.BatchId == latestBatch.Id);

        if (scope is { HasGlobalRead: false })
        {
            var visibleProjectCodes = ProjectReadScopePolicy
                .ApplyReadScope(_dbContext.Projects.AsNoTracking(), scope)
                .Select(x => x.Code);
            query = query.Where(x => visibleProjectCodes.Contains(x.ProjectCode));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.ProjectCode.Contains(normalizedSearch) ||
                x.ComplexProjectName.Contains(normalizedSearch) ||
                x.ProjectName.Contains(normalizedSearch) ||
                x.ObjectWbs.Contains(normalizedSearch) ||
                x.DisciplineCode.Contains(normalizedSearch) ||
                x.ResourceDisciplineName.Contains(normalizedSearch) ||
                x.BranchOfficeName.Contains(normalizedSearch) ||
                x.GipName.Contains(normalizedSearch));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.RowNumber)
            .ThenBy(x => x.Id)
            .Skip(normalizedSkip)
            .Take(normalizedTake)
            .Select(x => new ProjectSourceDataRowDto(
                x.Id,
                x.RowNumber,
                x.ProjectCode,
                x.ComplexProjectName,
                x.ProjectName,
                x.ObjectWbs,
                x.DisciplineCode,
                x.ResourceDisciplineName,
                x.BranchOfficeName,
                x.GipName,
                x.ManHours,
                x.PlannedStartDate,
                x.PlannedFinishDate,
                x.IsValid,
                x.ValidationMessage))
            .ToArrayAsync(cancellationToken);

        return new ProjectSourceDataPageDto(
            latestBatch.Id,
            latestBatch.FileName,
            latestBatch.Status,
            latestBatch.CreatedAtUtc,
            items,
            totalCount,
            normalizedSkip,
            normalizedTake);
    }

    public async Task<ProjectDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);

        return await ProjectReadScopePolicy.ApplyReadScope(_dbContext.Projects.AsNoTracking(), scope)
            .Where(x => x.Id == id)
            .Select(x => new ProjectDetailsDto(x.Id, x.Code, x.Name, x.GipUserId))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private sealed record SourceDataBatchSnapshot(
        Guid Id,
        string FileName,
        SourceDataImportBatchStatus Status,
        DateTimeOffset CreatedAtUtc);
}
