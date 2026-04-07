using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.UsersAdministration;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Admin;

public sealed class UsersAdministrationServiceTests
{
    [Fact]
    public async Task ListAsync_WithSearch_ShouldFilterByLoginDisplayNameAndEmail()
    {
        await using var db = TestDbContextFactory.Create();

        var first = CreateUser("alpha.login", "Alpha User", "alpha@example.com");
        var second = CreateUser("beta.login", "Beta Builder", "beta@example.com");
        var third = CreateUser("gamma.login", "Gamma User", "gamma@sample.org");

        await db.Set<AppUser>().AddRangeAsync(first, second, third);
        await db.SaveChangesAsync();

        var service = new UsersAdministrationService(db);

        var byLogin = await service.ListAsync("alpha");
        var byName = await service.ListAsync("Builder");
        var byEmail = await service.ListAsync("sample.org");

        Assert.Single(byLogin);
        Assert.Equal(first.Id, byLogin[0].Id);

        Assert.Single(byName);
        Assert.Equal(second.Id, byName[0].Id);

        Assert.Single(byEmail);
        Assert.Equal(third.Id, byEmail[0].Id);
    }

    [Fact]
    public async Task UpdateRolesAsync_ShouldReplaceUserRolesAndIsActiveFlag()
    {
        await using var db = TestDbContextFactory.Create();

        var roleGip = CreateRole("GIP", "Project engineer");
        var roleAuditor = CreateRole("AUDITOR", "Audit role");
        var user = CreateUser("role.user", "Role User", "role.user@example.com");

        var userRole = new AppUserRole
        {
            AppUserId = user.Id,
            AppUser = user,
            AppRoleId = roleGip.Id,
            AppRole = roleGip
        };
        user.Roles.Add(userRole);
        roleGip.Users.Add(userRole);

        await db.Set<AppRole>().AddRangeAsync(roleGip, roleAuditor);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new UsersAdministrationService(db);

        var updated = await service.UpdateRolesAsync(user.Id, new UpdateUserRolesRequest
        {
            RoleNames = new[] { roleAuditor.Name },
            IsActive = false
        });

        Assert.NotNull(updated);
        Assert.False(updated!.IsActive);
        var role = Assert.Single(updated.Roles);
        Assert.Equal(roleAuditor.Name, role);

        var persisted = await db.Set<AppUser>()
            .AsNoTracking()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .SingleAsync(x => x.Id == user.Id);

        Assert.False(persisted.IsActive);
        Assert.Single(persisted.Roles);
        Assert.Equal(roleAuditor.Name, persisted.Roles.Single().AppRole.Name);
    }

    [Fact]
    public async Task UpdateRolesAsync_WithUnknownRole_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create();

        var knownRole = CreateRole("COORDINATOR", "Known role");
        var user = CreateUser("unknown.role", "Unknown Role", "unknown.role@example.com");

        await db.Set<AppRole>().AddAsync(knownRole);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new UsersAdministrationService(db);

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateRolesAsync(
            user.Id,
            new UpdateUserRolesRequest
            {
                RoleNames = new[] { knownRole.Name, "MISSING_ROLE" },
                IsActive = true
            }));

        Assert.Contains("Unknown role names", error.Message);
        Assert.Equal("RoleNames", error.ParamName);
    }

    private static AppRole CreateRole(string name, string description)
    {
        return new AppRole
        {
            Name = name,
            Description = description
        };
    }

    private static AppUser CreateUser(string login, string displayName, string email)
    {
        return new AppUser
        {
            ExternalId = $"ext-{login}",
            Login = login,
            DisplayName = displayName,
            Email = email,
            IsActive = true
        };
    }
}
