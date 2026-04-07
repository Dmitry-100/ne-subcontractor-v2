using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Security;
using Subcontractor.Infrastructure.Persistence;

namespace Subcontractor.Infrastructure.Services;

public sealed class PermissionEvaluator : IPermissionEvaluator
{
    private readonly AppDbContext _dbContext;

    public PermissionEvaluator(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> HasPermissionAsync(string login, string permissionCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(permissionCode))
        {
            return false;
        }

        var normalizedLogin = LoginNormalizer.Normalize(login);
        if (string.IsNullOrWhiteSpace(normalizedLogin))
        {
            return false;
        }

        return await _dbContext.UsersSet
            .Where(x => x.Login == normalizedLogin && x.IsActive)
            .SelectMany(x => x.Roles)
            .SelectMany(x => x.AppRole.Permissions)
            .AnyAsync(x => x.PermissionCode == permissionCode, cancellationToken);
    }
}
