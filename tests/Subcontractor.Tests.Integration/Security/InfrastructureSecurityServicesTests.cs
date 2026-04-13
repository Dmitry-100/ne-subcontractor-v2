using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.Users;
using Subcontractor.Infrastructure.Services;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Tests.Integration.Security;

public sealed class InfrastructureSecurityServicesTests
{
    [Fact]
    public async Task PermissionEvaluator_ShouldReturnTrue_ForNormalizedDomainLogin()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        const string permissionCode = "contracts.read";
        await SeedUserPermissionAsync(db, login: "local.admin", permissionCode: permissionCode);

        var evaluator = new PermissionEvaluator(db);
        var hasPermission = await evaluator.HasPermissionAsync("CORP\\Local.Admin", permissionCode);

        Assert.True(hasPermission);
    }

    [Fact]
    public async Task PermissionEvaluator_ShouldReturnTrue_ForNormalizedUpnLogin()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        const string permissionCode = "contracts.read";
        await SeedUserPermissionAsync(db, login: "local.admin", permissionCode: permissionCode);

        var evaluator = new PermissionEvaluator(db);
        var hasPermission = await evaluator.HasPermissionAsync("local.admin@corp.local", permissionCode);

        Assert.True(hasPermission);
    }

    [Fact]
    public async Task PermissionEvaluator_ShouldReturnFalse_ForInactiveUser()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        const string permissionCode = "contracts.read";
        await SeedUserPermissionAsync(db, login: "inactive.user", permissionCode: permissionCode, isActive: false);

        var evaluator = new PermissionEvaluator(db);
        var hasPermission = await evaluator.HasPermissionAsync("inactive.user", permissionCode);

        Assert.False(hasPermission);
    }

    [Fact]
    public async Task PermissionEvaluator_ShouldReturnFalse_ForMissingPermission()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        await SeedUserPermissionAsync(db, login: "local.admin", permissionCode: "contracts.read");

        var evaluator = new PermissionEvaluator(db);
        var hasPermission = await evaluator.HasPermissionAsync("local.admin", "contracts.write");

        Assert.False(hasPermission);
    }

    [Fact]
    public async Task PermissionEvaluator_ShouldReturnFalse_WhenRoleIsSoftDeleted()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        const string permissionCode = "contracts.read";
        await SeedUserPermissionAsync(db, login: "local.admin", permissionCode: permissionCode);

        var role = await db.Set<AppRole>().SingleAsync(x => x.Name == "local.admin-role");
        role.MarkDeleted("security-tests", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();

        var evaluator = new PermissionEvaluator(db);
        var hasPermission = await evaluator.HasPermissionAsync("local.admin", permissionCode);

        Assert.False(hasPermission);
    }

    [Fact]
    public async Task PermissionEvaluator_ShouldReturnFalse_WhenUserIsSoftDeleted()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        const string permissionCode = "contracts.read";
        await SeedUserPermissionAsync(db, login: "local.admin", permissionCode: permissionCode);

        var user = await db.Set<AppUser>().SingleAsync(x => x.Login == "local.admin");
        user.MarkDeleted("security-tests", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();

        var evaluator = new PermissionEvaluator(db);
        var hasPermission = await evaluator.HasPermissionAsync("local.admin", permissionCode);

        Assert.False(hasPermission);
    }

    [Fact]
    public async Task PermissionEvaluator_ShouldReturnFalse_WhenLoginOrPermissionIsEmpty()
    {
        await using var db = TestDbContextFactory.Create("security-tests");
        var evaluator = new PermissionEvaluator(db);

        Assert.False(await evaluator.HasPermissionAsync(string.Empty, "contracts.read"));
        Assert.False(await evaluator.HasPermissionAsync("local.admin", string.Empty));
        Assert.False(await evaluator.HasPermissionAsync("   ", "contracts.read"));
    }

    [Fact]
    public async Task PermissionAuthorizationHandler_ShouldSucceed_WhenEvaluatorReturnsTrue()
    {
        var evaluator = new StubPermissionEvaluator { HasPermissionResult = true };
        var handler = new PermissionAuthorizationHandler(evaluator);
        var requirement = new PermissionRequirement("projects.read");
        var context = CreateAuthorizationContext("corp\\john.smith", requirement);

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.Equal(1, evaluator.CallCount);
        Assert.Equal("corp\\john.smith", evaluator.LastLogin);
        Assert.Equal("projects.read", evaluator.LastPermissionCode);
    }

    [Fact]
    public async Task PermissionAuthorizationHandler_ShouldNotSucceed_WhenIdentityNameIsMissing()
    {
        var evaluator = new StubPermissionEvaluator { HasPermissionResult = true };
        var handler = new PermissionAuthorizationHandler(evaluator);
        var requirement = new PermissionRequirement("projects.read");
        var principal = new ClaimsPrincipal(new ClaimsIdentity(authenticationType: "TestAuth"));
        var context = new AuthorizationHandlerContext([requirement], principal, null);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.Equal(0, evaluator.CallCount);
    }

    [Fact]
    public async Task PermissionAuthorizationHandler_ShouldNotSucceed_WhenEvaluatorReturnsFalse()
    {
        var evaluator = new StubPermissionEvaluator { HasPermissionResult = false };
        var handler = new PermissionAuthorizationHandler(evaluator);
        var requirement = new PermissionRequirement("projects.read");
        var context = CreateAuthorizationContext("corp\\john.smith", requirement);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
        Assert.Equal(1, evaluator.CallCount);
    }

    [Fact]
    public void CurrentUserService_ShouldReturnNormalizedLogin_FromHttpContextIdentityName()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [new Claim(ClaimTypes.Name, "CORP\\User.One")],
                    authenticationType: "TestAuth"))
        };

        var accessor = new HttpContextAccessor { HttpContext = httpContext };
        var service = new CurrentUserService(accessor);

        Assert.Equal("user.one", service.UserLogin);
    }

    [Fact]
    public void CurrentUserService_ShouldReturnSystem_WhenLoginIsUnavailable()
    {
        var accessor = new HttpContextAccessor { HttpContext = null };
        var service = new CurrentUserService(accessor);

        Assert.Equal("system", service.UserLogin);
    }

    [Fact]
    public void SystemDateTimeProvider_ShouldReturnCurrentUtcTimestamp()
    {
        var provider = new SystemDateTimeProvider();
        var before = DateTimeOffset.UtcNow;
        var value = provider.UtcNow;
        var after = DateTimeOffset.UtcNow;

        Assert.Equal(TimeSpan.Zero, value.Offset);
        Assert.InRange(value, before.AddSeconds(-1), after.AddSeconds(1));
    }

    private static AuthorizationHandlerContext CreateAuthorizationContext(
        string login,
        PermissionRequirement requirement)
    {
        var principal = new ClaimsPrincipal(
            new ClaimsIdentity(
                [new Claim(ClaimTypes.Name, login)],
                authenticationType: "TestAuth"));

        return new AuthorizationHandlerContext([requirement], principal, null);
    }

    private static async Task SeedUserPermissionAsync(
        DbContext db,
        string login,
        string permissionCode,
        bool isActive = true)
    {
        var role = new AppRole
        {
            Name = $"{login}-role",
            Description = $"Role for {login}"
        };
        role.Permissions.Add(new RolePermission
        {
            AppRole = role,
            PermissionCode = permissionCode
        });

        var user = new AppUser
        {
            Login = login,
            ExternalId = $"ext-{login}",
            DisplayName = login,
            Email = $"{login}@example.test",
            IsActive = isActive
        };
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = role
        });

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();
    }

    private sealed class StubPermissionEvaluator : IPermissionEvaluator
    {
        public bool HasPermissionResult { get; set; }
        public int CallCount { get; private set; }
        public string LastLogin { get; private set; } = string.Empty;
        public string LastPermissionCode { get; private set; } = string.Empty;

        public Task<bool> HasPermissionAsync(string login, string permissionCode, CancellationToken cancellationToken = default)
        {
            CallCount++;
            LastLogin = login;
            LastPermissionCode = permissionCode;
            return Task.FromResult(HasPermissionResult);
        }
    }
}
