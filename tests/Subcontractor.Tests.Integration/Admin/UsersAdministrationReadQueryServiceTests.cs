using Subcontractor.Application.UsersAdministration;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Admin;

public sealed class UsersAdministrationReadQueryServiceTests
{
    [Fact]
    public async Task GetByIdAsync_UnknownUser_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new UsersAdministrationReadQueryService(db);

        var result = await service.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task ListAsync_WithSearch_ShouldFilterAndReturnSortedRoles()
    {
        await using var db = TestDbContextFactory.Create();

        var roleAdmin = new AppRole { Name = "ADMIN", Description = "Admin role" };
        var roleViewer = new AppRole { Name = "VIEWER", Description = "Viewer role" };
        var roleOperator = new AppRole { Name = "OPERATOR", Description = "Operator role" };

        var user = new AppUser
        {
            ExternalId = "ext-read-user",
            Login = "read.user",
            DisplayName = "Read Builder",
            Email = "read.builder@example.com",
            IsActive = true
        };

        user.Roles.Add(new AppUserRole { AppUser = user, AppRole = roleViewer });
        user.Roles.Add(new AppUserRole { AppUser = user, AppRole = roleAdmin });
        user.Roles.Add(new AppUserRole { AppUser = user, AppRole = roleOperator });

        await db.Set<AppRole>().AddRangeAsync(roleAdmin, roleViewer, roleOperator);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var service = new UsersAdministrationReadQueryService(db);
        var result = await service.ListAsync("builder");

        var item = Assert.Single(result);
        Assert.Equal(user.Id, item.Id);
        Assert.Equal(new[] { "ADMIN", "OPERATOR", "VIEWER" }, item.Roles);
    }

    [Fact]
    public async Task ListRolesAsync_ShouldReturnRolesOrderedByName()
    {
        await using var db = TestDbContextFactory.Create();

        await db.Set<AppRole>().AddRangeAsync(
            new AppRole { Name = "VIEWER", Description = "Viewer role" },
            new AppRole { Name = "ADMIN", Description = "Admin role" },
            new AppRole { Name = "OPERATOR", Description = "Operator role" });
        await db.SaveChangesAsync();

        var service = new UsersAdministrationReadQueryService(db);
        var result = await service.ListRolesAsync();

        Assert.Equal(new[] { "ADMIN", "OPERATOR", "VIEWER" }, result.Select(x => x.Name).ToArray());
    }
}
