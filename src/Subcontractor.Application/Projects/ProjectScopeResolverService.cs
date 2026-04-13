using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Security;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.Projects;

public sealed class ProjectScopeResolverService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public ProjectScopeResolverService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    public async Task<ProjectAccessScope?> ResolveScopeAsync(CancellationToken cancellationToken = default)
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
            return new ProjectAccessScope(Guid.Empty, false);
        }

        var permissions = user.Roles
            .SelectMany(x => x.AppRole.Permissions)
            .Select(x => x.PermissionCode)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var hasGlobalRead = permissions.Contains(PermissionCodes.ProjectsReadAll)
                            || permissions.Contains(PermissionCodes.ProjectsCreate)
                            || permissions.Contains(PermissionCodes.ProjectsUpdate)
                            || permissions.Contains(PermissionCodes.ProjectsDelete);

        return new ProjectAccessScope(user.Id, hasGlobalRead);
    }
}
