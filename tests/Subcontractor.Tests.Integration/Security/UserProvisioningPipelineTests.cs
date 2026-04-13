using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.Users;
using Subcontractor.Infrastructure.Configuration;
using Subcontractor.Infrastructure.Services;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Middleware;

namespace Subcontractor.Tests.Integration.Security;

public sealed class UserProvisioningPipelineTests
{
    [Fact]
    public async Task EnsureCurrentUserAsync_ShouldCreateUser_AndAssignBootstrapAdministratorRole()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        await db.RolesSet.AddAsync(new AppRole
        {
            Name = RoleNames.Administrator,
            Description = "Administrator role"
        });
        await db.SaveChangesAsync();

        var service = new UserProvisioningService(
            db,
            Options.Create(new SecurityOptions
            {
                BootstrapAdminLogins = ["local.admin"]
            }));

        var principal = CreateAuthenticatedPrincipal(
            loginUpn: "local.admin@corp.local",
            displayName: "Локальный Администратор",
            externalId: "ext-local-admin",
            email: "local.admin@corp.local");

        await service.EnsureCurrentUserAsync(principal);

        var user = await db.UsersSet
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .SingleAsync(x => x.Login == "local.admin");

        Assert.Equal("ext-local-admin", user.ExternalId);
        Assert.Equal("Локальный Администратор", user.DisplayName);
        Assert.Equal("local.admin@corp.local", user.Email);
        Assert.True(user.IsActive);
        Assert.Contains(user.Roles, x => x.AppRole.Name == RoleNames.Administrator);
    }

    [Fact]
    public async Task EnsureCurrentUserAsync_WhenPrincipalIsNotAuthenticated_ShouldDoNothing()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        var service = new UserProvisioningService(
            db,
            Options.Create(new SecurityOptions()));

        var principal = new ClaimsPrincipal(new ClaimsIdentity());
        await service.EnsureCurrentUserAsync(principal);

        Assert.Empty(await db.UsersSet.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task EnsureCurrentUserAsync_WhenUserExists_ShouldUpdateProfile_AndKeepSingleAdminRole()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        var adminRole = new AppRole
        {
            Name = RoleNames.Administrator,
            Description = "Administrator role"
        };

        var existingUser = new AppUser
        {
            Login = "local.admin",
            ExternalId = "ext-old",
            DisplayName = "Old Name",
            Email = "old.email@corp.local",
            IsActive = true
        };
        existingUser.Roles.Add(new AppUserRole
        {
            AppUser = existingUser,
            AppRole = adminRole
        });

        await db.RolesSet.AddAsync(adminRole);
        await db.UsersSet.AddAsync(existingUser);
        await db.SaveChangesAsync();

        var service = new UserProvisioningService(
            db,
            Options.Create(new SecurityOptions
            {
                BootstrapAdminLogins = ["local.admin"]
            }));

        var principal = CreateAuthenticatedPrincipal(
            loginUpn: "local.admin@corp.local",
            displayName: "Новый Администратор",
            externalId: "ext-new",
            email: "new.email@corp.local");

        await service.EnsureCurrentUserAsync(principal);
        await service.EnsureCurrentUserAsync(principal);

        var user = await db.UsersSet
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .SingleAsync(x => x.Login == "local.admin");

        Assert.Equal("ext-new", user.ExternalId);
        Assert.Equal("Новый Администратор", user.DisplayName);
        Assert.Equal("new.email@corp.local", user.Email);
        Assert.Equal(1, user.Roles.Count(x => x.AppRole.Name == RoleNames.Administrator));
    }

    [Fact]
    public async Task EnsureCurrentUserAsync_WhenDisplayNameClaimMissing_ShouldFallbackToNormalizedLogin()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        var service = new UserProvisioningService(
            db,
            Options.Create(new SecurityOptions()));

        var principal = CreateAuthenticatedPrincipal(
            loginUpn: "User.Two@corp.local",
            displayName: null,
            externalId: "ext-user-two",
            email: null,
            includeDisplayNameClaim: false,
            includeEmailClaim: false);

        await service.EnsureCurrentUserAsync(principal);

        var user = await db.UsersSet.SingleAsync(x => x.Login == "user.two");
        Assert.Equal("user.two", user.DisplayName);
        Assert.Equal("User.Two@corp.local", user.Email);
    }

    [Fact]
    public async Task EnsureCurrentUserAsync_WhenBootstrapLoginButAdminRoleMissing_ShouldCreateUserWithoutRoles()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        var service = new UserProvisioningService(
            db,
            Options.Create(new SecurityOptions
            {
                BootstrapAdminLogins = ["local.admin"]
            }));

        var principal = CreateAuthenticatedPrincipal(
            loginUpn: "local.admin@corp.local",
            displayName: "Local Admin",
            externalId: "ext-local-admin",
            email: "local.admin@corp.local");

        await service.EnsureCurrentUserAsync(principal);

        var user = await db.UsersSet
            .Include(x => x.Roles)
            .SingleAsync(x => x.Login == "local.admin");

        Assert.Empty(user.Roles);
    }

    [Fact]
    public async Task CurrentUserProvisioningMiddleware_ShouldInvokeProvisioning_ForAuthenticatedUser()
    {
        var calledNext = false;
        var recorder = new UserProvisioningRecorder();
        var context = new DefaultHttpContext
        {
            User = CreateAuthenticatedPrincipal(
                loginUpn: "user.one@corp.local",
                displayName: "User One",
                externalId: "ext-user-one",
                email: "user.one@corp.local")
        };

        var middleware = new CurrentUserProvisioningMiddleware(_ =>
        {
            calledNext = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context, recorder);

        Assert.True(calledNext);
        Assert.Equal(1, recorder.CallCount);
        Assert.Equal(context.User, recorder.LastPrincipal);
        Assert.Equal(context.RequestAborted, recorder.LastCancellationToken);
    }

    [Fact]
    public async Task CurrentUserProvisioningMiddleware_ShouldSkipProvisioning_ForAnonymousUser()
    {
        var calledNext = false;
        var recorder = new UserProvisioningRecorder();
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity())
        };

        var middleware = new CurrentUserProvisioningMiddleware(_ =>
        {
            calledNext = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context, recorder);

        Assert.True(calledNext);
        Assert.Equal(0, recorder.CallCount);
    }

    private static ClaimsPrincipal CreateAuthenticatedPrincipal(
        string loginUpn,
        string? displayName,
        string? externalId,
        string? email,
        bool includeDisplayNameClaim = true,
        bool includeEmailClaim = true)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Upn, loginUpn)
        };

        if (includeDisplayNameClaim && !string.IsNullOrWhiteSpace(displayName))
        {
            claims.Add(new Claim(ClaimTypes.Name, displayName));
        }

        if (!string.IsNullOrWhiteSpace(externalId))
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, externalId));
        }

        if (includeEmailClaim && !string.IsNullOrWhiteSpace(email))
        {
            claims.Add(new Claim(ClaimTypes.Email, email));
        }

        var identity = new ClaimsIdentity(
            claims,
            authenticationType: "TestAuth",
            nameType: ClaimTypes.Upn,
            roleType: ClaimTypes.Role);

        return new ClaimsPrincipal(identity);
    }

    private sealed class UserProvisioningRecorder : IUserProvisioningService
    {
        public int CallCount { get; private set; }
        public ClaimsPrincipal? LastPrincipal { get; private set; }
        public CancellationToken LastCancellationToken { get; private set; }

        public Task EnsureCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastPrincipal = principal;
            LastCancellationToken = cancellationToken;
            return Task.CompletedTask;
        }
    }
}
