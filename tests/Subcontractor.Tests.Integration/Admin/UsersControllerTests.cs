using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.UsersAdministration;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Admin;

public sealed class UsersControllerTests
{
    [Fact]
    public async Task ListUsers_ShouldReturnOkWithPayload()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<AppUser>().AddRangeAsync(
            CreateUser("alpha.user", "Alpha User", "alpha@example.com"),
            CreateUser("beta.user", "Beta User", "beta@example.com"));
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var actionResult = await controller.ListUsers(null, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(actionResult.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<UserListItemDto>>(ok.Value);
        Assert.Equal(2, payload.Count);
    }

    [Fact]
    public async Task GetUser_UnknownId_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var actionResult = await controller.GetUser(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(actionResult.Result);
    }

    [Fact]
    public async Task UpdateUserRoles_WithUnknownRole_ShouldReturnBadRequest()
    {
        await using var db = TestDbContextFactory.Create();
        var existingRole = CreateRole("GIP", "Known role");
        var user = CreateUser("role.test", "Role Test", "role.test@example.com");

        await db.Set<AppRole>().AddAsync(existingRole);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.UpdateUserRoles(
            user.Id,
            new UpdateUserRolesRequest
            {
                RoleNames = new[] { "UNKNOWN_ROLE" },
                IsActive = true
            },
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("Unknown role", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateUserRoles_WithKnownRole_ShouldReturnOkWithUpdatedDto()
    {
        await using var db = TestDbContextFactory.Create();
        var role = CreateRole("ADMIN", "Admin role");
        var user = CreateUser("update.role", "Update Role", "update.role@example.com");

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.UpdateUserRoles(
            user.Id,
            new UpdateUserRolesRequest
            {
                RoleNames = new[] { role.Name },
                IsActive = false
            },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<UserDetailsDto>(ok.Value);
        Assert.False(payload.IsActive);
        var assignedRole = Assert.Single(payload.Roles);
        Assert.Equal(role.Name, assignedRole);
    }

    private static UsersController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var service = new UsersAdministrationService(db);
        return new UsersController(service);
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
