using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Projects;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Projects;

public sealed class ProjectsControllerTests
{
    [Fact]
    public async Task List_WithPagingParameters_ShouldReturnPageEnvelope()
    {
        await using var db = TestDbContextFactory.Create();
        await SeedScopedProjectsAsync(db, "projects-controller-page");

        var controller = CreateController(db, "projects-controller-page");
        var result = await controller.List(
            search: null,
            skip: 1,
            take: 2,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<ProjectListPageDto>(ok.Value);

        Assert.Equal(4, payload.TotalCount);
        Assert.Equal(1, payload.Skip);
        Assert.Equal(2, payload.Take);
        Assert.Collection(payload.Items,
            x => Assert.Equal("PRJ-C-002", x.Code),
            x => Assert.Equal("PRJ-C-003", x.Code));
    }

    [Fact]
    public async Task List_WithoutPaging_ShouldReturnLegacyArrayContract()
    {
        await using var db = TestDbContextFactory.Create();
        await SeedScopedProjectsAsync(db, "projects-controller-legacy");

        var controller = CreateController(db, "projects-controller-legacy");
        var result = await controller.List(
            search: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<ProjectListItemDto>>(ok.Value);

        Assert.Equal(4, payload.Count);
        Assert.Equal("PRJ-C-001", payload[0].Code);
        Assert.Equal("PRJ-C-004", payload[3].Code);
    }

    [Fact]
    public async Task GetById_WhenProjectExists_ShouldReturnOk()
    {
        var expected = new ProjectDetailsDto(Guid.NewGuid(), "PRJ-OK-001", "Project", null);
        var service = new StubProjectsService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<ProjectDetailsDto?>(expected)
        };
        var controller = new ProjectsController(service);

        var result = await controller.GetById(expected.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ProjectDetailsDto>(ok.Value);
        Assert.Equal(expected.Id, payload.Id);
    }

    [Fact]
    public async Task GetById_WhenProjectMissing_ShouldReturnNotFound()
    {
        var service = new StubProjectsService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<ProjectDetailsDto?>(null)
        };
        var controller = new ProjectsController(service);

        var result = await controller.GetById(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_WhenSuccessful_ShouldReturnCreatedAtAction()
    {
        var expected = new ProjectDetailsDto(Guid.NewGuid(), "PRJ-CREATE-001", "Created", null);
        var service = new StubProjectsService
        {
            CreateAsyncHandler = (_, _) => Task.FromResult(expected)
        };
        var controller = new ProjectsController(service);

        var result = await controller.Create(new CreateProjectRequest { Code = "PRJ-CREATE-001", Name = "Created" }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<ProjectDetailsDto>(created.Value);
        Assert.Equal(nameof(ProjectsController.GetById), created.ActionName);
        Assert.Equal(expected.Id, payload.Id);
    }

    [Fact]
    public async Task Create_WhenServiceThrowsInvalidOperation_ShouldReturnConflictProblem()
    {
        var service = new StubProjectsService
        {
            CreateAsyncHandler = (_, _) => throw new InvalidOperationException("Duplicate project code.")
        };
        var controller = new ProjectsController(service);

        var result = await controller.Create(new CreateProjectRequest { Code = "PRJ-001", Name = "Name" }, CancellationToken.None);

        var conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task Create_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubProjectsService
        {
            CreateAsyncHandler = (_, _) => throw new ArgumentException("Invalid payload.")
        };
        var controller = new ProjectsController(service);

        var result = await controller.Create(new CreateProjectRequest { Code = "", Name = "" }, CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task Update_WhenProjectExists_ShouldReturnOk()
    {
        var expected = new ProjectDetailsDto(Guid.NewGuid(), "PRJ-UPD-001", "Updated", null);
        var service = new StubProjectsService
        {
            UpdateAsyncHandler = (id, _, _) => Task.FromResult<ProjectDetailsDto?>(expected with { Id = id })
        };
        var controller = new ProjectsController(service);

        var result = await controller.Update(expected.Id, new UpdateProjectRequest { Name = "Updated" }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ProjectDetailsDto>(ok.Value);
        Assert.Equal(expected.Id, payload.Id);
    }

    [Fact]
    public async Task Update_WhenProjectMissing_ShouldReturnNotFound()
    {
        var service = new StubProjectsService
        {
            UpdateAsyncHandler = (_, _, _) => Task.FromResult<ProjectDetailsDto?>(null)
        };
        var controller = new ProjectsController(service);

        var result = await controller.Update(Guid.NewGuid(), new UpdateProjectRequest { Name = "Updated" }, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Update_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubProjectsService
        {
            UpdateAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid project name.")
        };
        var controller = new ProjectsController(service);

        var result = await controller.Update(Guid.NewGuid(), new UpdateProjectRequest { Name = "" }, CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task Delete_WhenProjectExists_ShouldReturnNoContent()
    {
        var service = new StubProjectsService
        {
            DeleteAsyncHandler = (_, _) => Task.FromResult(true)
        };
        var controller = new ProjectsController(service);

        var result = await controller.Delete(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenProjectMissing_ShouldReturnNotFound()
    {
        var service = new StubProjectsService
        {
            DeleteAsyncHandler = (_, _) => Task.FromResult(false)
        };
        var controller = new ProjectsController(service);

        var result = await controller.Delete(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    private static async Task SeedScopedProjectsAsync(Infrastructure.Persistence.AppDbContext db, string login)
    {
        var currentUser = CreateUser(login);
        var otherUser = CreateUser($"{login}-other");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        await db.Set<Project>().AddRangeAsync(
            new Project { Code = "PRJ-C-001", Name = "Own 1", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-C-002", Name = "Own 2", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-C-003", Name = "Own 3", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-C-004", Name = "Own 4", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-C-999", Name = "Other", GipUserId = otherUser.Id });
        await db.SaveChangesAsync();
    }

    private static ProjectsController CreateController(Infrastructure.Persistence.AppDbContext db, string login)
    {
        var service = new ProjectsService(db, new TestCurrentUserService(login));
        return new ProjectsController(service);
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

    private sealed class StubProjectsService : IProjectsService
    {
        public Func<string?, CancellationToken, Task<IReadOnlyList<ProjectListItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProjectListItemDto>>(Array.Empty<ProjectListItemDto>());

        public Func<string?, int, int, CancellationToken, Task<ProjectListPageDto>> ListPageAsyncHandler { get; set; } =
            static (_, skip, take, _) => Task.FromResult(new ProjectListPageDto(Array.Empty<ProjectListItemDto>(), 0, skip, take));

        public Func<Guid, CancellationToken, Task<ProjectDetailsDto?>> GetByIdAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<ProjectDetailsDto?>(null);

        public Func<CreateProjectRequest, CancellationToken, Task<ProjectDetailsDto>> CreateAsyncHandler { get; set; } =
            static (request, _) => Task.FromResult(new ProjectDetailsDto(Guid.NewGuid(), request.Code, request.Name, request.GipUserId));

        public Func<Guid, UpdateProjectRequest, CancellationToken, Task<ProjectDetailsDto?>> UpdateAsyncHandler { get; set; } =
            static (id, request, _) => Task.FromResult<ProjectDetailsDto?>(new ProjectDetailsDto(id, "PRJ-UPD", request.Name, request.GipUserId));

        public Func<Guid, CancellationToken, Task<bool>> DeleteAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(true);

        public Task<IReadOnlyList<ProjectListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
            => ListAsyncHandler(search, cancellationToken);

        public Task<ProjectListPageDto> ListPageAsync(string? search, int skip, int take, CancellationToken cancellationToken = default)
            => ListPageAsyncHandler(search, skip, take, cancellationToken);

        public Task<ProjectDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetByIdAsyncHandler(id, cancellationToken);

        public Task<ProjectDetailsDto> CreateAsync(CreateProjectRequest request, CancellationToken cancellationToken = default)
            => CreateAsyncHandler(request, cancellationToken);

        public Task<ProjectDetailsDto?> UpdateAsync(Guid id, UpdateProjectRequest request, CancellationToken cancellationToken = default)
            => UpdateAsyncHandler(id, request, cancellationToken);

        public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
            => DeleteAsyncHandler(id, cancellationToken);
    }
}
