using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.UsersAdministration;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Admin;

public sealed class UsersControllerBranchCoverageTests
{
    [Fact]
    public async Task Endpoints_ShouldCoverSuccessBranches()
    {
        var service = new StubUsersAdministrationService();
        var controller = new UsersController(service);
        var userId = Guid.NewGuid();

        var listUsers = await controller.ListUsers(search: "admin", CancellationToken.None);
        var getUser = await controller.GetUser(userId, CancellationToken.None);
        var updateRoles = await controller.UpdateUserRoles(
            userId,
            new UpdateUserRolesRequest { RoleNames = new[] { "ADMIN" }, IsActive = true },
            CancellationToken.None);
        var listRoles = await controller.ListRoles(CancellationToken.None);

        Assert.IsType<OkObjectResult>(listUsers.Result);
        Assert.IsType<OkObjectResult>(getUser.Result);
        Assert.IsType<OkObjectResult>(updateRoles.Result);
        Assert.IsType<OkObjectResult>(listRoles.Result);
    }

    [Fact]
    public async Task GetUser_WhenUserMissing_ShouldReturnNotFound()
    {
        var service = new StubUsersAdministrationService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<UserDetailsDto?>(null)
        };
        var controller = new UsersController(service);

        var result = await controller.GetUser(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserRoles_WhenUserMissing_ShouldReturnNotFound()
    {
        var service = new StubUsersAdministrationService
        {
            UpdateRolesAsyncHandler = (_, _, _) => Task.FromResult<UserDetailsDto?>(null)
        };
        var controller = new UsersController(service);

        var result = await controller.UpdateUserRoles(
            Guid.NewGuid(),
            new UpdateUserRolesRequest { RoleNames = new[] { "ADMIN" }, IsActive = true },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserRoles_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubUsersAdministrationService
        {
            UpdateRolesAsyncHandler = (_, _, _) => throw new ArgumentException("Unknown role.")
        };
        var controller = new UsersController(service);

        var result = await controller.UpdateUserRoles(
            Guid.NewGuid(),
            new UpdateUserRolesRequest { RoleNames = new[] { "UNKNOWN" }, IsActive = true },
            CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    private static UserListItemDto CreateUserListItem(Guid? id = null)
    {
        return new UserListItemDto(
            id ?? Guid.NewGuid(),
            "admin.user",
            "Admin User",
            "admin@example.com",
            true,
            new[] { "ADMIN" });
    }

    private static UserDetailsDto CreateUserDetails(Guid? id = null)
    {
        return new UserDetailsDto(
            id ?? Guid.NewGuid(),
            "admin.user",
            "Admin User",
            "admin@example.com",
            true,
            new[] { "ADMIN" });
    }

    private static RoleLookupItemDto CreateRole(Guid? id = null)
    {
        return new RoleLookupItemDto(
            id ?? Guid.NewGuid(),
            "ADMIN",
            "Administrator");
    }

    private sealed class StubUsersAdministrationService : IUsersAdministrationService
    {
        public Func<string?, CancellationToken, Task<IReadOnlyList<UserListItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<UserListItemDto>>(new[] { CreateUserListItem() });

        public Func<Guid, CancellationToken, Task<UserDetailsDto?>> GetByIdAsyncHandler { get; set; } =
            static (id, _) => Task.FromResult<UserDetailsDto?>(CreateUserDetails(id));

        public Func<Guid, UpdateUserRolesRequest, CancellationToken, Task<UserDetailsDto?>> UpdateRolesAsyncHandler { get; set; } =
            static (id, _, _) => Task.FromResult<UserDetailsDto?>(CreateUserDetails(id));

        public Func<CancellationToken, Task<IReadOnlyList<RoleLookupItemDto>>> ListRolesAsyncHandler { get; set; } =
            static _ => Task.FromResult<IReadOnlyList<RoleLookupItemDto>>(new[] { CreateRole() });

        public Task<IReadOnlyList<UserListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
            => ListAsyncHandler(search, cancellationToken);

        public Task<UserDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetByIdAsyncHandler(id, cancellationToken);

        public Task<UserDetailsDto?> UpdateRolesAsync(
            Guid id,
            UpdateUserRolesRequest request,
            CancellationToken cancellationToken = default)
            => UpdateRolesAsyncHandler(id, request, cancellationToken);

        public Task<IReadOnlyList<RoleLookupItemDto>> ListRolesAsync(CancellationToken cancellationToken = default)
            => ListRolesAsyncHandler(cancellationToken);
    }
}
