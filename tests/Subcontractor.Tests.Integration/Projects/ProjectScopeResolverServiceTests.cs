using Subcontractor.Application.Projects;
using Subcontractor.Application.Security;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Projects;

public sealed class ProjectScopeResolverServiceTests
{
    [Fact]
    public async Task ResolveScopeAsync_SystemLogin_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ProjectScopeResolverService(db, new TestCurrentUserService("system"));

        var result = await service.ResolveScopeAsync();

        Assert.Null(result);
    }

    [Fact]
    public async Task ResolveScopeAsync_UnknownUser_ShouldReturnEmptyScopedAccess()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ProjectScopeResolverService(db, new TestCurrentUserService("missing-user"));

        var result = await service.ResolveScopeAsync();

        Assert.NotNull(result);
        Assert.Equal(Guid.Empty, result!.AppUserId);
        Assert.False(result.HasGlobalRead);
    }

    [Fact]
    public async Task ResolveScopeAsync_UserWithProjectsReadAllPermission_ShouldReturnGlobalScope()
    {
        await using var db = TestDbContextFactory.Create();
        var user = CreateUser("global-project-user");
        var role = new AppRole
        {
            Name = "ProjectGlobalReader",
            Description = "Reads all projects"
        };
        role.Permissions.Add(new RolePermission
        {
            AppRole = role,
            AppRoleId = role.Id,
            PermissionCode = PermissionCodes.ProjectsReadAll
        });
        var userRole = new AppUserRole
        {
            AppUser = user,
            AppUserId = user.Id,
            AppRole = role,
            AppRoleId = role.Id
        };
        user.Roles.Add(userRole);
        role.Users.Add(userRole);

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new ProjectScopeResolverService(db, new TestCurrentUserService("global-project-user"));
        var result = await service.ResolveScopeAsync();

        Assert.NotNull(result);
        Assert.Equal(user.Id, result!.AppUserId);
        Assert.True(result.HasGlobalRead);
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
