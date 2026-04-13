using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.UsersAdministration;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Admin;

public sealed class UsersAdministrationWriteWorkflowServiceTests
{
    [Fact]
    public async Task UpdateRolesAsync_UnknownUser_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<AppRole>().AddAsync(CreateRole("ADMIN", "Admin role"));
        await db.SaveChangesAsync();

        var service = new UsersAdministrationWriteWorkflowService(db);
        var result = await service.UpdateRolesAsync(
            Guid.NewGuid(),
            new UpdateUserRolesRequest
            {
                RoleNames = ["ADMIN"],
                IsActive = true
            });

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateRolesAsync_ShouldReplaceRolesAndIsActiveFlag()
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

        var service = new UsersAdministrationWriteWorkflowService(db);
        var updated = await service.UpdateRolesAsync(user.Id, new UpdateUserRolesRequest
        {
            RoleNames = [roleAuditor.Name],
            IsActive = false
        });

        Assert.NotNull(updated);
        Assert.False(updated!.IsActive);
        Assert.Equal(new[] { roleAuditor.Name }, updated.Roles);

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
    public async Task UpdateRolesAsync_WithCaseInsensitiveRoleNames_ShouldNotThrowUnknownRole()
    {
        await using var db = TestDbContextFactory.Create();

        var adminRole = CreateRole("ADMIN", "Admin role");
        var user = CreateUser("case.user", "Case User", "case.user@example.com");

        await db.Set<AppRole>().AddAsync(adminRole);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new UsersAdministrationWriteWorkflowService(db);
        var updated = await service.UpdateRolesAsync(user.Id, new UpdateUserRolesRequest
        {
            RoleNames = ["admin"],
            IsActive = true
        });

        Assert.NotNull(updated);
        Assert.Equal(new[] { "ADMIN" }, updated!.Roles);
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

        var service = new UsersAdministrationWriteWorkflowService(db);
        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateRolesAsync(
            user.Id,
            new UpdateUserRolesRequest
            {
                RoleNames = [knownRole.Name, "MISSING_ROLE"],
                IsActive = true
            }));

        Assert.Contains("Unknown role names", error.Message);
        Assert.Contains("MISSING_ROLE", error.Message);
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
