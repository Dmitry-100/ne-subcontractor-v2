using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.UsersAdministration;

public sealed class UsersAdministrationWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public UsersAdministrationWriteWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserDetailsDto?> UpdateRolesAsync(
        Guid id,
        UpdateUserRolesRequest request,
        CancellationToken cancellationToken = default)
    {
        var requestedRoleNames = UsersAdministrationRolePolicy.NormalizeRoleNames(request.RoleNames);
        var requestedRoleNameSet = requestedRoleNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var knownRoles = await _dbContext.Set<AppRole>()
            .ToListAsync(cancellationToken);
        var matchedRoles = knownRoles
            .Where(x => requestedRoleNameSet.Contains(x.Name))
            .ToArray();

        UsersAdministrationRolePolicy.EnsureRequestedRolesKnown(
            requestedRoleNames,
            matchedRoles,
            nameof(request.RoleNames));

        var user = await _dbContext.Set<AppUser>()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (user is null)
        {
            return null;
        }

        user.IsActive = request.IsActive ?? user.IsActive;

        var currentRoleNameSet = user.Roles
            .Select(x => x.AppRole.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var roleLinksToRemove = user.Roles
            .Where(x => !requestedRoleNameSet.Contains(x.AppRole.Name))
            .ToArray();

        foreach (var roleLink in roleLinksToRemove)
        {
            _dbContext.Set<AppUserRole>().Remove(roleLink);
        }

        foreach (var role in matchedRoles.Where(x => !currentRoleNameSet.Contains(x.Name)))
        {
            user.Roles.Add(new AppUserRole
            {
                AppUserId = user.Id,
                AppRoleId = role.Id
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var reloadedUser = await _dbContext.Set<AppUser>()
            .AsNoTracking()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .FirstAsync(x => x.Id == user.Id, cancellationToken);

        return UsersAdministrationReadProjectionPolicy.ToDetailsDto(reloadedUser);
    }
}
