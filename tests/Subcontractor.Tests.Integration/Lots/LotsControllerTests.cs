using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotsControllerTests
{
    [Fact]
    public async Task List_WithPagingParameters_ShouldReturnPageEnvelope()
    {
        await using var db = TestDbContextFactory.Create();
        await SeedLotsAsync(db);

        var controller = new LotsController(new LotsService(db));
        var result = await controller.List(
            search: null,
            status: null,
            projectId: null,
            skip: 1,
            take: 2,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<LotListPageDto>(ok.Value);

        Assert.Equal(4, payload.TotalCount);
        Assert.Equal(1, payload.Skip);
        Assert.Equal(2, payload.Take);
        Assert.Collection(payload.Items,
            x => Assert.Equal("LOT-C-002", x.Code),
            x => Assert.Equal("LOT-C-003", x.Code));
    }

    [Fact]
    public async Task List_WithoutPaging_ShouldReturnLegacyArrayContract()
    {
        await using var db = TestDbContextFactory.Create();
        await SeedLotsAsync(db);

        var controller = new LotsController(new LotsService(db));
        var result = await controller.List(
            search: null,
            status: null,
            projectId: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<LotListItemDto>>(ok.Value);

        Assert.Equal(4, payload.Count);
        Assert.Equal("LOT-C-001", payload[0].Code);
        Assert.Equal("LOT-C-004", payload[3].Code);
    }

    [Fact]
    public async Task GetById_WhenLotExists_ShouldReturnOk()
    {
        var expected = new LotDetailsDto(
            Guid.NewGuid(),
            "LOT-GET-001",
            "Lot",
            LotStatus.Draft,
            null,
            Array.Empty<LotItemDto>());
        var service = new StubLotsService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<LotDetailsDto?>(expected)
        };
        var controller = new LotsController(service);

        var result = await controller.GetById(expected.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<LotDetailsDto>(ok.Value);
        Assert.Equal(expected.Id, payload.Id);
    }

    [Fact]
    public async Task GetById_WhenLotMissing_ShouldReturnNotFound()
    {
        var service = new StubLotsService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<LotDetailsDto?>(null)
        };
        var controller = new LotsController(service);

        var result = await controller.GetById(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_WhenSuccessful_ShouldReturnCreatedAtAction()
    {
        var expected = new LotDetailsDto(
            Guid.NewGuid(),
            "LOT-CREATE-001",
            "Created",
            LotStatus.Draft,
            null,
            Array.Empty<LotItemDto>());
        var service = new StubLotsService
        {
            CreateAsyncHandler = (_, _) => Task.FromResult(expected)
        };
        var controller = new LotsController(service);

        var result = await controller.Create(new CreateLotRequest { Code = "LOT-CREATE-001", Name = "Created" }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<LotDetailsDto>(created.Value);
        Assert.Equal(nameof(LotsController.GetById), created.ActionName);
        Assert.Equal(expected.Id, payload.Id);
    }

    [Fact]
    public async Task Create_WhenServiceThrowsInvalidOperation_ShouldReturnConflictProblem()
    {
        var service = new StubLotsService
        {
            CreateAsyncHandler = (_, _) => throw new InvalidOperationException("Lot already exists.")
        };
        var controller = new LotsController(service);

        var result = await controller.Create(new CreateLotRequest(), CancellationToken.None);

        var conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task Create_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubLotsService
        {
            CreateAsyncHandler = (_, _) => throw new ArgumentException("Invalid lot request.")
        };
        var controller = new LotsController(service);

        var result = await controller.Create(new CreateLotRequest(), CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task Update_WhenLotExists_ShouldReturnOk()
    {
        var expected = new LotDetailsDto(
            Guid.NewGuid(),
            "LOT-UPD-001",
            "Updated",
            LotStatus.Draft,
            null,
            Array.Empty<LotItemDto>());
        var service = new StubLotsService
        {
            UpdateAsyncHandler = (id, _, _) => Task.FromResult<LotDetailsDto?>(expected with { Id = id })
        };
        var controller = new LotsController(service);

        var result = await controller.Update(expected.Id, new UpdateLotRequest { Name = "Updated" }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<LotDetailsDto>(ok.Value);
        Assert.Equal(expected.Id, payload.Id);
    }

    [Fact]
    public async Task Update_WhenLotMissing_ShouldReturnNotFound()
    {
        var service = new StubLotsService
        {
            UpdateAsyncHandler = (_, _, _) => Task.FromResult<LotDetailsDto?>(null)
        };
        var controller = new LotsController(service);

        var result = await controller.Update(Guid.NewGuid(), new UpdateLotRequest { Name = "Updated" }, CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Update_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubLotsService
        {
            UpdateAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid lot update.")
        };
        var controller = new LotsController(service);

        var result = await controller.Update(Guid.NewGuid(), new UpdateLotRequest(), CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task Delete_WhenLotExists_ShouldReturnNoContent()
    {
        var service = new StubLotsService
        {
            DeleteAsyncHandler = (_, _) => Task.FromResult(true)
        };
        var controller = new LotsController(service);

        var result = await controller.Delete(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenLotMissing_ShouldReturnNotFound()
    {
        var service = new StubLotsService
        {
            DeleteAsyncHandler = (_, _) => Task.FromResult(false)
        };
        var controller = new LotsController(service);

        var result = await controller.Delete(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Transition_WhenSuccessful_ShouldReturnOk()
    {
        var history = new LotStatusHistoryItemDto(
            Guid.NewGuid(),
            LotStatus.Draft,
            LotStatus.InProcurement,
            "To procurement",
            "tester",
            DateTimeOffset.UtcNow);
        var service = new StubLotsService
        {
            TransitionAsyncHandler = (_, _, _) => Task.FromResult<LotStatusHistoryItemDto?>(history)
        };
        var controller = new LotsController(service);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new LotStatusTransitionRequest { TargetStatus = LotStatus.InProcurement },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<LotStatusHistoryItemDto>(ok.Value);
        Assert.Equal(history.Id, payload.Id);
    }

    [Fact]
    public async Task Transition_WhenLotMissing_ShouldReturnNotFound()
    {
        var service = new StubLotsService
        {
            TransitionAsyncHandler = (_, _, _) => Task.FromResult<LotStatusHistoryItemDto?>(null)
        };
        var controller = new LotsController(service);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new LotStatusTransitionRequest { TargetStatus = LotStatus.InProcurement },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Transition_WhenServiceThrowsInvalidOperation_ShouldReturnConflictProblem()
    {
        var service = new StubLotsService
        {
            TransitionAsyncHandler = (_, _, _) => throw new InvalidOperationException("Transition is not allowed.")
        };
        var controller = new LotsController(service);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new LotStatusTransitionRequest { TargetStatus = LotStatus.Contracted },
            CancellationToken.None);

        var conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task Transition_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubLotsService
        {
            TransitionAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid target status.")
        };
        var controller = new LotsController(service);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new LotStatusTransitionRequest { TargetStatus = LotStatus.Draft },
            CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task History_ShouldReturnOk()
    {
        var expected = new List<LotStatusHistoryItemDto>
        {
            new(Guid.NewGuid(), LotStatus.Draft, LotStatus.InProcurement, "Initial", "tester", DateTimeOffset.UtcNow)
        };
        var service = new StubLotsService
        {
            GetHistoryAsyncHandler = (_, _) => Task.FromResult<IReadOnlyList<LotStatusHistoryItemDto>>(expected)
        };
        var controller = new LotsController(service);

        var result = await controller.History(Guid.NewGuid(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<LotStatusHistoryItemDto>>(ok.Value);
        Assert.Single(payload);
    }

    private static async Task SeedLotsAsync(Infrastructure.Persistence.AppDbContext db)
    {
        await db.Set<Lot>().AddRangeAsync(
            new Lot { Code = "LOT-C-001", Name = "Lot 1", Status = LotStatus.Draft },
            new Lot { Code = "LOT-C-002", Name = "Lot 2", Status = LotStatus.Draft },
            new Lot { Code = "LOT-C-003", Name = "Lot 3", Status = LotStatus.InExecution },
            new Lot { Code = "LOT-C-004", Name = "Lot 4", Status = LotStatus.Closed });
        await db.SaveChangesAsync();
    }

    private sealed class StubLotsService : ILotsService
    {
        public Func<string?, LotStatus?, Guid?, CancellationToken, Task<IReadOnlyList<LotListItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _, _, _) => Task.FromResult<IReadOnlyList<LotListItemDto>>(Array.Empty<LotListItemDto>());

        public Func<string?, LotStatus?, Guid?, int, int, CancellationToken, Task<LotListPageDto>> ListPageAsyncHandler { get; set; } =
            static (_, _, _, skip, take, _) => Task.FromResult(new LotListPageDto(Array.Empty<LotListItemDto>(), 0, skip, take));

        public Func<Guid, CancellationToken, Task<LotDetailsDto?>> GetByIdAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<LotDetailsDto?>(null);

        public Func<CreateLotRequest, CancellationToken, Task<LotDetailsDto>> CreateAsyncHandler { get; set; } =
            static (request, _) => Task.FromResult(
                new LotDetailsDto(Guid.NewGuid(), request.Code, request.Name, LotStatus.Draft, request.ResponsibleCommercialUserId, Array.Empty<LotItemDto>()));

        public Func<Guid, UpdateLotRequest, CancellationToken, Task<LotDetailsDto?>> UpdateAsyncHandler { get; set; } =
            static (id, request, _) => Task.FromResult<LotDetailsDto?>(
                new LotDetailsDto(id, "LOT-UPD", request.Name, LotStatus.Draft, request.ResponsibleCommercialUserId, Array.Empty<LotItemDto>()));

        public Func<Guid, CancellationToken, Task<bool>> DeleteAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(true);

        public Func<Guid, LotStatusTransitionRequest, CancellationToken, Task<LotStatusHistoryItemDto?>> TransitionAsyncHandler { get; set; } =
            static (_, request, _) => Task.FromResult<LotStatusHistoryItemDto?>(
                new LotStatusHistoryItemDto(Guid.NewGuid(), LotStatus.Draft, request.TargetStatus, "Transition", "tester", DateTimeOffset.UtcNow));

        public Func<Guid, CancellationToken, Task<IReadOnlyList<LotStatusHistoryItemDto>>> GetHistoryAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<LotStatusHistoryItemDto>>(Array.Empty<LotStatusHistoryItemDto>());

        public Task<IReadOnlyList<LotListItemDto>> ListAsync(
            string? search,
            LotStatus? status,
            Guid? projectId,
            CancellationToken cancellationToken = default)
            => ListAsyncHandler(search, status, projectId, cancellationToken);

        public Task<LotListPageDto> ListPageAsync(
            string? search,
            LotStatus? status,
            Guid? projectId,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
            => ListPageAsyncHandler(search, status, projectId, skip, take, cancellationToken);

        public Task<LotDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetByIdAsyncHandler(id, cancellationToken);

        public Task<LotDetailsDto> CreateAsync(CreateLotRequest request, CancellationToken cancellationToken = default)
            => CreateAsyncHandler(request, cancellationToken);

        public Task<LotDetailsDto?> UpdateAsync(Guid id, UpdateLotRequest request, CancellationToken cancellationToken = default)
            => UpdateAsyncHandler(id, request, cancellationToken);

        public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
            => DeleteAsyncHandler(id, cancellationToken);

        public Task<LotStatusHistoryItemDto?> TransitionAsync(
            Guid id,
            LotStatusTransitionRequest request,
            CancellationToken cancellationToken = default)
            => TransitionAsyncHandler(id, request, cancellationToken);

        public Task<IReadOnlyList<LotStatusHistoryItemDto>> GetHistoryAsync(Guid lotId, CancellationToken cancellationToken = default)
            => GetHistoryAsyncHandler(lotId, cancellationToken);
    }
}
