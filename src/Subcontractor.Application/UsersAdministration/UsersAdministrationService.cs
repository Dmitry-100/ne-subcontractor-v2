using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.UsersAdministration;

public sealed class UsersAdministrationService : IUsersAdministrationService
{
    private readonly IApplicationDbContext _dbContext;

    public UsersAdministrationService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<UserListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Set<AppUser>()
            .AsNoTracking()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.Login.Contains(normalizedSearch) ||
                x.DisplayName.Contains(normalizedSearch) ||
                x.Email.Contains(normalizedSearch));
        }

        var users = await query
            .OrderBy(x => x.Login)
            .ToListAsync(cancellationToken);

        return users
            .Select(ToListItemDto)
            .ToArray();
    }

    public async Task<UserDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Set<AppUser>()
            .AsNoTracking()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return user is null ? null : ToDetailsDto(user);
    }

    public async Task<UserDetailsDto?> UpdateRolesAsync(
        Guid id,
        UpdateUserRolesRequest request,
        CancellationToken cancellationToken = default)
    {
        var requestedRoleNames = NormalizeRoleNames(request.RoleNames);
        var knownRoles = await _dbContext.Set<AppRole>()
            .Where(x => requestedRoleNames.Contains(x.Name))
            .ToListAsync(cancellationToken);

        if (knownRoles.Count != requestedRoleNames.Length)
        {
            var unknownRoles = requestedRoleNames
                .Where(x => knownRoles.All(r => r.Name != x))
                .OrderBy(x => x)
                .ToArray();

            throw new ArgumentException(
                $"Unknown role names: {string.Join(", ", unknownRoles)}",
                nameof(request.RoleNames));
        }

        var user = await _dbContext.Set<AppUser>()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (user is null)
        {
            return null;
        }

        user.IsActive = request.IsActive ?? user.IsActive;

        var currentRoleNames = user.Roles
            .Select(x => x.AppRole.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var toRemove = user.Roles
            .Where(x => !requestedRoleNames.Contains(x.AppRole.Name))
            .ToArray();

        foreach (var roleLink in toRemove)
        {
            _dbContext.Set<AppUserRole>().Remove(roleLink);
        }

        foreach (var role in knownRoles.Where(x => !currentRoleNames.Contains(x.Name)))
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

        return ToDetailsDto(reloadedUser);
    }

    public async Task<IReadOnlyList<RoleLookupItemDto>> ListRolesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<AppRole>()
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new RoleLookupItemDto(x.Id, x.Name, x.Description))
            .ToListAsync(cancellationToken);
    }

    private static string[] NormalizeRoleNames(IReadOnlyCollection<string>? roleNames)
    {
        return (roleNames ?? Array.Empty<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static UserListItemDto ToListItemDto(AppUser user)
    {
        return new UserListItemDto(
            user.Id,
            user.Login,
            user.DisplayName,
            user.Email,
            user.IsActive,
            user.Roles.Select(x => x.AppRole.Name).OrderBy(x => x).ToArray());
    }

    private static UserDetailsDto ToDetailsDto(AppUser user)
    {
        return new UserDetailsDto(
            user.Id,
            user.Login,
            user.DisplayName,
            user.Email,
            user.IsActive,
            user.Roles.Select(x => x.AppRole.Name).OrderBy(x => x).ToArray());
    }
}
