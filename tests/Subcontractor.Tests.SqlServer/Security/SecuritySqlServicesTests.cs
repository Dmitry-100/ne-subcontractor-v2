using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Subcontractor.Domain.Users;
using Subcontractor.Infrastructure.Configuration;
using Subcontractor.Infrastructure.Services;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Security;

[Trait("SqlSuite", "Core")]
public sealed class SecuritySqlServicesTests
{
    [SqlFact]
    public async Task PermissionEvaluator_ShouldNormalizeLogin_AndResolvePermission_FromSqlStorage()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("security-sql");
        await using var db = database.CreateDbContext("security-sql");
        const string permissionCode = PermissionCodes.ContractsRead;
        await SeedUserPermissionAsync(db, login: "local.admin", permissionCode: permissionCode);

        var evaluator = new PermissionEvaluator(db);

        Assert.True(await evaluator.HasPermissionAsync(@"CORP\Local.Admin", permissionCode));
        Assert.True(await evaluator.HasPermissionAsync("local.admin@corp.local", permissionCode));
        Assert.False(await evaluator.HasPermissionAsync("local.admin", PermissionCodes.ContractsUpdate));
    }

    [SqlFact]
    public async Task PermissionEvaluator_ShouldReturnFalse_WhenRoleOrUserSoftDeleted()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("security-sql");
        await using var db = database.CreateDbContext("security-sql");
        const string permissionCode = PermissionCodes.ContractsRead;
        await SeedUserPermissionAsync(db, login: "local.admin", permissionCode: permissionCode);

        var evaluator = new PermissionEvaluator(db);
        Assert.True(await evaluator.HasPermissionAsync("local.admin", permissionCode));

        var role = await db.RolesSet.SingleAsync(x => x.Name == "local.admin-role");
        role.MarkDeleted("security-sql", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();

        Assert.False(await evaluator.HasPermissionAsync("local.admin", permissionCode));

        var restoredRole = new AppRole
        {
            Name = "restored.local.admin-role",
            Description = "restored role"
        };
        restoredRole.Permissions.Add(new RolePermission
        {
            AppRole = restoredRole,
            PermissionCode = permissionCode
        });

        var user = await db.UsersSet.SingleAsync(x => x.Login == "local.admin");
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = restoredRole
        });

        await db.RolesSet.AddAsync(restoredRole);
        await db.SaveChangesAsync();

        Assert.True(await evaluator.HasPermissionAsync("local.admin", permissionCode));

        user.MarkDeleted("security-sql", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();

        Assert.False(await evaluator.HasPermissionAsync("local.admin", permissionCode));
    }

    [SqlFact]
    public async Task UserProvisioningService_ShouldCreateAndUpdateUser_AndAssignBootstrapAdminRole()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("security-sql");
        await using var db = database.CreateDbContext("security-sql");

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

        var createdPrincipal = CreateAuthenticatedPrincipal(
            loginUpn: "local.admin@corp.local",
            displayName: "Локальный администратор",
            externalId: "ext-local-admin",
            email: "local.admin@corp.local");

        await service.EnsureCurrentUserAsync(createdPrincipal);
        await service.EnsureCurrentUserAsync(createdPrincipal);

        var createdUser = await db.UsersSet
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .SingleAsync(x => x.Login == "local.admin");

        Assert.Equal("ext-local-admin", createdUser.ExternalId);
        Assert.Equal("Локальный администратор", createdUser.DisplayName);
        Assert.Equal("local.admin@corp.local", createdUser.Email);
        Assert.True(createdUser.IsActive);
        Assert.Equal(1, createdUser.Roles.Count(x => x.AppRole.Name == RoleNames.Administrator));

        var updatedPrincipal = CreateAuthenticatedPrincipal(
            loginUpn: "local.admin@corp.local",
            displayName: "Новый локальный администратор",
            externalId: "ext-local-admin-v2",
            email: "local.admin.updated@corp.local");

        await service.EnsureCurrentUserAsync(updatedPrincipal);

        var updatedUser = await db.UsersSet
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .SingleAsync(x => x.Login == "local.admin");

        Assert.Equal("ext-local-admin-v2", updatedUser.ExternalId);
        Assert.Equal("Новый локальный администратор", updatedUser.DisplayName);
        Assert.Equal("local.admin.updated@corp.local", updatedUser.Email);
        Assert.Equal(1, updatedUser.Roles.Count(x => x.AppRole.Name == RoleNames.Administrator));
    }

    private static ClaimsPrincipal CreateAuthenticatedPrincipal(
        string loginUpn,
        string displayName,
        string externalId,
        string email)
    {
        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Upn, loginUpn),
            new Claim(ClaimTypes.Name, displayName),
            new Claim(ClaimTypes.NameIdentifier, externalId),
            new Claim(ClaimTypes.Email, email)
        ],
            authenticationType: "SqlSecurityTests",
            nameType: ClaimTypes.Upn,
            roleType: ClaimTypes.Role);

        return new ClaimsPrincipal(identity);
    }

    private static async Task SeedUserPermissionAsync(
        DbContext db,
        string login,
        string permissionCode)
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
            IsActive = true
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
}
