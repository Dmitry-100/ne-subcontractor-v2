using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Projects;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Projects;

public sealed class ProjectWriteWorkflowServiceTests
{
    [Fact]
    public async Task CreateAsync_ScopedUser_ShouldOverrideGipUserId()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("write-scope-user");
        await db.Set<AppUser>().AddAsync(currentUser);
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("write-scope-user"));
        var service = new ProjectWriteWorkflowService(db, scopeResolver);

        var created = await service.CreateAsync(new CreateProjectRequest
        {
            Code = " PRJ-W-001 ",
            Name = " New project ",
            GipUserId = Guid.NewGuid()
        });

        Assert.Equal("PRJ-W-001", created.Code);
        Assert.Equal("New project", created.Name);
        Assert.Equal(currentUser.Id, created.GipUserId);
    }

    [Fact]
    public async Task CreateAsync_DuplicateCode_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-W-002",
            Name = "Existing"
        });
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("system"));
        var service = new ProjectWriteWorkflowService(db, scopeResolver);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(new CreateProjectRequest
        {
            Code = "PRJ-W-002",
            Name = "Duplicate"
        }));

        Assert.Contains("already exists", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateAsync_UnknownProject_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("system"));
        var service = new ProjectWriteWorkflowService(db, scopeResolver);

        var result = await service.UpdateAsync(Guid.NewGuid(), new UpdateProjectRequest
        {
            Name = "Unknown"
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_ScopedUser_ShouldNotDeleteProjectOutOfScope()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("write-delete-user");
        var otherUser = CreateUser("write-delete-other");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        var project = new Project
        {
            Code = "PRJ-W-003",
            Name = "Other project",
            GipUserId = otherUser.Id
        };
        await db.Set<Project>().AddAsync(project);
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("write-delete-user"));
        var service = new ProjectWriteWorkflowService(db, scopeResolver);

        var deleted = await service.DeleteAsync(project.Id);

        Assert.False(deleted);
        var persisted = await db.Set<Project>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == project.Id);
        Assert.NotNull(persisted);
        Assert.False(persisted!.IsDeleted);
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
