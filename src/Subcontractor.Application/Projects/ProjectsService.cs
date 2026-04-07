using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Application.Security;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.Projects;

public sealed class ProjectsService : IProjectsService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public ProjectsService(IApplicationDbContext dbContext, ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
    {
        var scope = await ResolveScopeAsync(cancellationToken);
        var query = ApplyReadScope(_dbContext.Projects.AsNoTracking(), scope);

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

    public async Task<ProjectDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        return await ApplyReadScope(_dbContext.Projects.AsNoTracking(), scope)
            .Where(x => x.Id == id)
            .Select(x => new ProjectDetailsDto(x.Id, x.Code, x.Name, x.GipUserId))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProjectDetailsDto> CreateAsync(CreateProjectRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedCode = request.Code.Trim();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            throw new ArgumentException("Project code is required.", nameof(request.Code));
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Project name is required.", nameof(request.Name));
        }

        var exists = await _dbContext.Projects.AnyAsync(x => x.Code == normalizedCode, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Project with code '{normalizedCode}' already exists.");
        }

        var entity = new Project
        {
            Code = normalizedCode,
            Name = request.Name.Trim(),
            GipUserId = request.GipUserId
        };

        var scope = await ResolveScopeAsync(cancellationToken);
        if (scope is { HasGlobalRead: false })
        {
            entity.GipUserId = scope.AppUserId;
        }

        await _dbContext.Set<Project>().AddAsync(entity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ProjectDetailsDto(entity.Id, entity.Code, entity.Name, entity.GipUserId);
    }

    public async Task<ProjectDetailsDto?> UpdateAsync(Guid id, UpdateProjectRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Project name is required.", nameof(request.Name));
        }

        var scope = await ResolveScopeAsync(cancellationToken);
        var entity = await ApplyReadScope(_dbContext.Set<Project>(), scope)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        entity.Name = request.Name.Trim();
        if (scope is { HasGlobalRead: false })
        {
            entity.GipUserId = scope.AppUserId;
        }
        else
        {
            entity.GipUserId = request.GipUserId;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new ProjectDetailsDto(entity.Id, entity.Code, entity.Name, entity.GipUserId);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var scope = await ResolveScopeAsync(cancellationToken);
        var entity = await ApplyReadScope(_dbContext.Set<Project>(), scope)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return false;
        }

        _dbContext.Set<Project>().Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<ProjectScope?> ResolveScopeAsync(CancellationToken cancellationToken)
    {
        var normalizedLogin = LoginNormalizer.Normalize(_currentUserService.UserLogin);
        if (string.IsNullOrWhiteSpace(normalizedLogin) || normalizedLogin == "system")
        {
            return null;
        }

        var user = await _dbContext.Set<AppUser>()
            .AsNoTracking()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .ThenInclude(x => x.Permissions)
            .FirstOrDefaultAsync(x => x.Login == normalizedLogin && x.IsActive, cancellationToken);

        if (user is null)
        {
            return new ProjectScope(Guid.Empty, false);
        }

        var permissions = user.Roles
            .SelectMany(x => x.AppRole.Permissions)
            .Select(x => x.PermissionCode)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var hasGlobalRead = permissions.Contains(PermissionCodes.ProjectsReadAll)
                            || permissions.Contains(PermissionCodes.ProjectsCreate)
                            || permissions.Contains(PermissionCodes.ProjectsUpdate)
                            || permissions.Contains(PermissionCodes.ProjectsDelete);

        return new ProjectScope(user.Id, hasGlobalRead);
    }

    private static IQueryable<Project> ApplyReadScope(IQueryable<Project> query, ProjectScope? scope)
    {
        if (scope is null || scope.HasGlobalRead)
        {
            return query;
        }

        return query.Where(x => x.GipUserId == scope.AppUserId);
    }

    private sealed record ProjectScope(Guid AppUserId, bool HasGlobalRead);
}
