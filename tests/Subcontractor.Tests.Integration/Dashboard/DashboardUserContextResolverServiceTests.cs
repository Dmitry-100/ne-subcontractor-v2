using Subcontractor.Application.Dashboard;
using Subcontractor.Application.Security;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardUserContextResolverServiceTests
{
    [Fact]
    public async Task ResolveAsync_WithSystemLogin_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create("dashboard-user-context-system");
        var service = new DashboardUserContextResolverService(db, new TestCurrentUserService("system"));

        var context = await service.ResolveAsync();

        Assert.Null(context);
    }

    [Fact]
    public async Task ResolveAsync_WithUnknownOrInactiveUser_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create("dashboard-user-context-unknown");

        var inactiveUser = CreateUser("inactive.user", isActive: false);
        await db.Set<AppUser>().AddAsync(inactiveUser);
        await db.SaveChangesAsync();

        var unknownContext = await new DashboardUserContextResolverService(db, new TestCurrentUserService("missing.user"))
            .ResolveAsync();
        var inactiveContext = await new DashboardUserContextResolverService(db, new TestCurrentUserService("inactive.user"))
            .ResolveAsync();

        Assert.Null(unknownContext);
        Assert.Null(inactiveContext);
    }

    [Fact]
    public async Task ResolveAsync_WithActiveUser_ShouldReturnRolesPermissionsAndGlobalProjectsScope()
    {
        await using var db = TestDbContextFactory.Create("dashboard-user-context-active");

        var roleOperations = CreateRole(
            "DASH_OPERATIONS",
            PermissionCodes.ProjectsRead,
            PermissionCodes.ProjectsUpdate,
            PermissionCodes.ContractsRead);
        var roleWorkflow = CreateRole(
            "DASH_WORKFLOW",
            PermissionCodes.ProceduresRead,
            PermissionCodes.ProceduresTransition);
        var user = CreateUser("dash.active", isActive: true);
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = roleOperations
        });
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = roleWorkflow
        });

        await db.Set<AppRole>().AddRangeAsync(roleOperations, roleWorkflow);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new DashboardUserContextResolverService(db, new TestCurrentUserService("DASH.ACTIVE"));
        var context = await service.ResolveAsync();

        Assert.NotNull(context);
        Assert.Equal(user.Id, context!.AppUserId);
        Assert.True(context.RoleNames.Contains("dash_operations"));
        Assert.True(context.RoleNames.Contains("DASH_WORKFLOW"));
        Assert.True(context.Permissions.Contains(PermissionCodes.ContractsRead));
        Assert.True(context.Permissions.Contains(PermissionCodes.ProceduresTransition));
        Assert.True(context.HasProjectsGlobalRead);
    }

    [Fact]
    public async Task ResolveAsync_WithoutProjectsGlobalPermissions_ShouldDisableGlobalProjectsScope()
    {
        await using var db = TestDbContextFactory.Create("dashboard-user-context-no-global-projects");

        var role = CreateRole("DASH_SCOPE", PermissionCodes.ProjectsRead);
        var user = CreateUser("dash.scope", isActive: true);
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = role
        });

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new DashboardUserContextResolverService(db, new TestCurrentUserService("dash.scope"));
        var context = await service.ResolveAsync();

        Assert.NotNull(context);
        Assert.False(context!.HasProjectsGlobalRead);
    }

    private static AppRole CreateRole(string roleName, params string[] permissionCodes)
    {
        var role = new AppRole
        {
            Name = roleName,
            Description = "Dashboard context role"
        };

        foreach (var permissionCode in permissionCodes)
        {
            role.Permissions.Add(new RolePermission
            {
                AppRole = role,
                PermissionCode = permissionCode
            });
        }

        return role;
    }

    private static AppUser CreateUser(string login, bool isActive)
    {
        return new AppUser
        {
            ExternalId = $"ext-{login}",
            Login = login,
            DisplayName = login,
            Email = $"{login}@example.com",
            IsActive = isActive
        };
    }
}
