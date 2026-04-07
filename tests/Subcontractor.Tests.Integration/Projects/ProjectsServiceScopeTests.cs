using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Projects;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Projects;

public sealed class ProjectsServiceScopeTests
{
    [Fact]
    public async Task ListAsync_ScopedUser_ShouldReturnOnlyOwnProjects()
    {
        await using var db = TestDbContextFactory.Create();

        var currentUser = CreateUser("gip-user");
        var otherUser = CreateUser("other-user");
        var currentUserId = currentUser.Id;

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        await db.Set<Project>().AddRangeAsync(
            new Project { Code = "PRJ-001", Name = "Own project", GipUserId = currentUserId },
            new Project { Code = "PRJ-002", Name = "Other project", GipUserId = otherUser.Id },
            new Project { Code = "PRJ-003", Name = "Unassigned project", GipUserId = null });
        await db.SaveChangesAsync();

        var service = new ProjectsService(db, new TestCurrentUserService("gip-user"));
        var result = await service.ListAsync(null);

        var item = Assert.Single(result);
        Assert.Equal("PRJ-001", item.Code);
        Assert.Equal(currentUserId, item.GipUserId);
    }

    [Fact]
    public async Task ListAsync_UserWithGlobalPermission_ShouldReturnAllProjects()
    {
        await using var db = TestDbContextFactory.Create();

        var currentUser = CreateUser("global-user");
        var otherUser = CreateUser("other-user");
        var currentUserId = currentUser.Id;

        var role = new AppRole
        {
            Name = "GlobalReader",
            Description = "Can read all projects"
        };
        role.Permissions.Add(new RolePermission
        {
            AppRoleId = role.Id,
            AppRole = role,
            PermissionCode = PermissionCodes.ProjectsReadAll
        });

        var userRole = new AppUserRole
        {
            AppUserId = currentUser.Id,
            AppUser = currentUser,
            AppRoleId = role.Id,
            AppRole = role
        };
        currentUser.Roles.Add(userRole);
        role.Users.Add(userRole);

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        await db.Set<Project>().AddRangeAsync(
            new Project { Code = "PRJ-001", Name = "Own project", GipUserId = currentUserId },
            new Project { Code = "PRJ-002", Name = "Other project", GipUserId = otherUser.Id },
            new Project { Code = "PRJ-003", Name = "Unassigned project", GipUserId = null });
        await db.SaveChangesAsync();

        var service = new ProjectsService(db, new TestCurrentUserService("global-user"));
        var result = await service.ListAsync(null);

        Assert.Equal(3, result.Count);
        Assert.Contains(result, x => x.Code == "PRJ-001");
        Assert.Contains(result, x => x.Code == "PRJ-002");
        Assert.Contains(result, x => x.Code == "PRJ-003");
    }

    [Fact]
    public async Task CreateAsync_ScopedUser_ShouldOverrideGipUserId()
    {
        await using var db = TestDbContextFactory.Create();

        var user = CreateUser("scoped-user");
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new ProjectsService(db, new TestCurrentUserService("scoped-user"));
        var created = await service.CreateAsync(new CreateProjectRequest
        {
            Code = "PRJ-NEW",
            Name = "New project",
            GipUserId = Guid.NewGuid()
        });

        var currentUserId = user.Id;
        Assert.Equal(currentUserId, created.GipUserId);

        var persisted = await db.Set<Project>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == created.Id);

        Assert.Equal(currentUserId, persisted.GipUserId);
    }

    private static AppUser CreateUser(string login)
    {
        return new AppUser
        {
            ExternalId = $"ext-{login}",
            Login = login,
            DisplayName = login,
            Email = $"{login}@example.com",
            IsActive = true
        };
    }
}
