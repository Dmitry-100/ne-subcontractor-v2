using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Security;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.Dashboard;

public sealed class DashboardUserContextResolverService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public DashboardUserContextResolverService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    public async Task<DashboardUserContext?> ResolveAsync(CancellationToken cancellationToken = default)
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
            return null;
        }

        var roleNames = user.Roles
            .Select(x => x.AppRole.Name)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var permissions = user.Roles
            .SelectMany(x => x.AppRole.Permissions)
            .Select(x => x.PermissionCode)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var hasProjectsGlobalRead = permissions.Contains(PermissionCodes.ProjectsReadAll)
                                    || permissions.Contains(PermissionCodes.ProjectsCreate)
                                    || permissions.Contains(PermissionCodes.ProjectsUpdate)
                                    || permissions.Contains(PermissionCodes.ProjectsDelete);

        return new DashboardUserContext(
            user.Id,
            roleNames,
            permissions,
            hasProjectsGlobalRead);
    }
}
