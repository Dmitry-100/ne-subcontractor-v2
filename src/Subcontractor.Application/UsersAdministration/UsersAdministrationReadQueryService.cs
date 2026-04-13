using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.UsersAdministration;

public sealed class UsersAdministrationReadQueryService
{
    private static readonly Func<DbContext, IAsyncEnumerable<RoleLookupItemDto>> CompiledListRolesQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<AppRole>()
                    .AsNoTracking()
                    .OrderBy(x => x.Name)
                    .Select(x => new RoleLookupItemDto(x.Id, x.Name, x.Description)));

    private readonly IApplicationDbContext _dbContext;

    public UsersAdministrationReadQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<UserListItemDto>> ListAsync(
        string? search,
        CancellationToken cancellationToken = default)
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
            .Select(UsersAdministrationReadProjectionPolicy.ToListItemDto)
            .ToArray();
    }

    public async Task<UserDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Set<AppUser>()
            .AsNoTracking()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return user is null
            ? null
            : UsersAdministrationReadProjectionPolicy.ToDetailsDto(user);
    }

    public async Task<IReadOnlyList<RoleLookupItemDto>> ListRolesAsync(CancellationToken cancellationToken = default)
    {
        if (_dbContext is DbContext efDbContext)
        {
            var roles = new List<RoleLookupItemDto>();
            await foreach (var role in CompiledListRolesQuery(efDbContext))
            {
                cancellationToken.ThrowIfCancellationRequested();
                roles.Add(role);
            }

            return roles;
        }

        return await _dbContext.Set<AppRole>()
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new RoleLookupItemDto(x.Id, x.Name, x.Description))
            .ToListAsync(cancellationToken);
    }
}
