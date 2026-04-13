using Subcontractor.Application.Projects;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Projects;

public sealed class ProjectReadQueryServiceTests
{
    [Fact]
    public async Task ListAsync_ScopedUser_ShouldReturnOnlyOwnProjects()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("read-scope-user");
        var otherUser = CreateUser("read-other-user");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        await db.Set<Project>().AddRangeAsync(
            new Project { Code = "PRJ-R-001", Name = "Own", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-R-002", Name = "Other", GipUserId = otherUser.Id });
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("read-scope-user"));
        var service = new ProjectReadQueryService(db, scopeResolver);

        var result = await service.ListAsync(null);

        var item = Assert.Single(result);
        Assert.Equal("PRJ-R-001", item.Code);
        Assert.Equal(currentUser.Id, item.GipUserId);
    }

    [Fact]
    public async Task GetByIdAsync_ProjectOutOfScope_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("read-by-id-user");
        var otherUser = CreateUser("read-by-id-other");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        var outOfScopeProject = new Project
        {
            Code = "PRJ-R-003",
            Name = "Other project",
            GipUserId = otherUser.Id
        };
        await db.Set<Project>().AddAsync(outOfScopeProject);
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("read-by-id-user"));
        var service = new ProjectReadQueryService(db, scopeResolver);

        var result = await service.GetByIdAsync(outOfScopeProject.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task ListPageAsync_ShouldReturnPageAndTotalCountWithinScope()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("read-page-user");
        var otherUser = CreateUser("read-page-other");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        await db.Set<Project>().AddRangeAsync(
            new Project { Code = "PRJ-P-001", Name = "Own 1", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-002", Name = "Own 2", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-003", Name = "Own 3", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-004", Name = "Own 4", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-005", Name = "Own 5", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-999", Name = "Other", GipUserId = otherUser.Id });
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("read-page-user"));
        var service = new ProjectReadQueryService(db, scopeResolver);

        var result = await service.ListPageAsync(null, skip: 1, take: 2);

        Assert.Equal(5, result.TotalCount);
        Assert.Equal(1, result.Skip);
        Assert.Equal(2, result.Take);
        Assert.Collection(result.Items,
            x => Assert.Equal("PRJ-P-002", x.Code),
            x => Assert.Equal("PRJ-P-003", x.Code));
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
