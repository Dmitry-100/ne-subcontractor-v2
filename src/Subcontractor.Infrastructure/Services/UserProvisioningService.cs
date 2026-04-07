using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Security;
using Subcontractor.Domain.Users;
using Subcontractor.Infrastructure.Configuration;
using Subcontractor.Infrastructure.Persistence;

namespace Subcontractor.Infrastructure.Services;

public sealed class UserProvisioningService : IUserProvisioningService
{
    private static readonly string[] ExternalIdClaimTypes =
    [
        "http://schemas.microsoft.com/identity/claims/objectidentifier",
        ClaimTypes.NameIdentifier,
        ClaimTypes.Sid,
        ClaimTypes.PrimarySid
    ];

    private static readonly string[] EmailClaimTypes =
    [
        ClaimTypes.Email,
        ClaimTypes.Upn,
        "email",
        "mail"
    ];

    private readonly AppDbContext _dbContext;
    private readonly IOptions<SecurityOptions> _securityOptions;

    public UserProvisioningService(AppDbContext dbContext, IOptions<SecurityOptions> securityOptions)
    {
        _dbContext = dbContext;
        _securityOptions = securityOptions;
    }

    public async Task EnsureCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        if (!(principal.Identity?.IsAuthenticated ?? false))
        {
            return;
        }

        var normalizedLogin = LoginNormalizer.Normalize(principal.Identity?.Name);
        if (string.IsNullOrWhiteSpace(normalizedLogin))
        {
            return;
        }

        var externalId = ResolveFirstClaim(principal, ExternalIdClaimTypes);
        var displayName = ResolveDisplayName(principal, normalizedLogin);
        var email = ResolveFirstClaim(principal, EmailClaimTypes);

        var user = await _dbContext.UsersSet
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .FirstOrDefaultAsync(x => x.Login == normalizedLogin, cancellationToken);

        var hasChanges = false;

        if (user is null)
        {
            user = new AppUser
            {
                Login = normalizedLogin,
                ExternalId = string.IsNullOrWhiteSpace(externalId) ? normalizedLogin : externalId,
                DisplayName = displayName,
                Email = email ?? string.Empty,
                IsActive = true
            };

            await _dbContext.UsersSet.AddAsync(user, cancellationToken);
            hasChanges = true;
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(externalId) && !string.Equals(user.ExternalId, externalId, StringComparison.Ordinal))
            {
                user.ExternalId = externalId;
                hasChanges = true;
            }

            if (!string.Equals(user.DisplayName, displayName, StringComparison.Ordinal))
            {
                user.DisplayName = displayName;
                hasChanges = true;
            }

            var normalizedEmail = email ?? string.Empty;
            if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                user.Email = normalizedEmail;
                hasChanges = true;
            }
        }

        if (ShouldAssignBootstrapAdministrator(normalizedLogin))
        {
            var adminRole = await _dbContext.RolesSet
                .FirstOrDefaultAsync(x => x.Name == RoleNames.Administrator, cancellationToken);

            if (adminRole is not null)
            {
                var hasAdminRole = user.Roles.Any(x => x.AppRoleId == adminRole.Id || x.AppRole?.Name == RoleNames.Administrator);
                if (!hasAdminRole)
                {
                    user.Roles.Add(new AppUserRole
                    {
                        AppRoleId = adminRole.Id,
                        AppUser = user
                    });
                    hasChanges = true;
                }
            }
        }

        if (hasChanges)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private bool ShouldAssignBootstrapAdministrator(string normalizedLogin)
    {
        var allowedLogins = _securityOptions.Value.BootstrapAdminLogins
            .Select(LoginNormalizer.Normalize)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.Ordinal);

        return allowedLogins.Contains(normalizedLogin);
    }

    private static string ResolveDisplayName(ClaimsPrincipal principal, string fallback)
    {
        var displayName = principal.FindFirst(ClaimTypes.Name)?.Value;
        if (string.IsNullOrWhiteSpace(displayName))
        {
            displayName = fallback;
        }

        return displayName.Trim();
    }

    private static string? ResolveFirstClaim(ClaimsPrincipal principal, IEnumerable<string> claimTypes)
    {
        foreach (var claimType in claimTypes)
        {
            var value = principal.FindFirst(claimType)?.Value;
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }
}
