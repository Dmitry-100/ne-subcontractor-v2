using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Contracts;

public sealed class ContractsControllerBranchCoverageTests
{
    [Fact]
    public async Task List_ShouldSwitchBetweenLegacyAndPagedContracts()
    {
        var controller = new ContractsController(new StubContractsService());

        var legacy = await controller.List(
            search: "legacy",
            status: ContractStatus.Draft,
            lotId: null,
            procedureId: null,
            contractorId: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);
        var paged = await controller.List(
            search: "paged",
            status: ContractStatus.Active,
            lotId: Guid.NewGuid(),
            procedureId: Guid.NewGuid(),
            contractorId: Guid.NewGuid(),
            skip: 0,
            take: 15,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var legacyOk = Assert.IsType<OkObjectResult>(legacy);
        Assert.IsAssignableFrom<IReadOnlyList<ContractListItemDto>>(legacyOk.Value);

        var pagedOk = Assert.IsType<OkObjectResult>(paged);
        Assert.IsType<ContractListPageDto>(pagedOk.Value);
    }

    [Fact]
    public async Task ReadEndpoints_ShouldReturnOkPayloads()
    {
        var controller = new ContractsController(new StubContractsService());
        var contractId = Guid.NewGuid();

        var byId = await controller.GetById(contractId, CancellationToken.None);
        var history = await controller.History(contractId, CancellationToken.None);
        var execution = await controller.ExecutionSummary(contractId, CancellationToken.None);
        var milestones = await controller.GetMilestones(contractId, CancellationToken.None);
        var controlPoints = await controller.GetMonitoringControlPoints(contractId, CancellationToken.None);
        var mdrCards = await controller.GetMdrCards(contractId, CancellationToken.None);
        var cpTemplate = controller.DownloadControlPointsTemplate();
        var mdrTemplate = controller.DownloadMdrCardsTemplate();

        Assert.IsType<OkObjectResult>(byId.Result);
        Assert.IsType<OkObjectResult>(history.Result);
        Assert.IsType<OkObjectResult>(execution.Result);
        Assert.IsType<OkObjectResult>(milestones.Result);
        Assert.IsType<OkObjectResult>(controlPoints.Result);
        Assert.IsType<OkObjectResult>(mdrCards.Result);
        Assert.IsType<FileContentResult>(cpTemplate);
        Assert.IsType<FileContentResult>(mdrTemplate);
    }

    [Fact]
    public async Task ReadEndpoints_WhenContractMissing_ShouldReturnNotFound()
    {
        var service = new StubContractsService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<ContractDetailsDto?>(null),
            GetExecutionSummaryAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetMilestonesAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetMonitoringControlPointsAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetMdrCardsAsyncHandler = (_, _) => throw new KeyNotFoundException()
        };
        var controller = new ContractsController(service);
        var contractId = Guid.NewGuid();

        var byId = await controller.GetById(contractId, CancellationToken.None);
        var execution = await controller.ExecutionSummary(contractId, CancellationToken.None);
        var milestones = await controller.GetMilestones(contractId, CancellationToken.None);
        var controlPoints = await controller.GetMonitoringControlPoints(contractId, CancellationToken.None);
        var mdrCards = await controller.GetMdrCards(contractId, CancellationToken.None);

        Assert.IsType<NotFoundResult>(byId.Result);
        Assert.IsType<NotFoundResult>(execution.Result);
        Assert.IsType<NotFoundResult>(milestones.Result);
        Assert.IsType<NotFoundResult>(controlPoints.Result);
        Assert.IsType<NotFoundResult>(mdrCards.Result);
    }

    [Fact]
    public async Task MutationEndpoints_ShouldReturnSuccessResults()
    {
        var controller = new ContractsController(new StubContractsService());
        var contractId = Guid.NewGuid();

        var create = await controller.Create(CreateRequest(), CancellationToken.None);
        var update = await controller.Update(contractId, UpdateRequest(), CancellationToken.None);
        var delete = await controller.Delete(contractId, CancellationToken.None);
        var transition = await controller.Transition(contractId, TransitionRequest(), CancellationToken.None);
        var upsertMilestones = await controller.UpsertMilestones(contractId, MilestonesRequest(), CancellationToken.None);
        var upsertControlPoints = await controller.UpsertMonitoringControlPoints(contractId, MonitoringControlPointsRequest(), CancellationToken.None);
        var upsertMdrCards = await controller.UpsertMdrCards(contractId, MdrCardsRequest(), CancellationToken.None);
        var importForecastFact = await controller.ImportMdrForecastFact(contractId, ImportRequest(), CancellationToken.None);
        var createDraftFromProcedure = await controller.CreateDraftFromProcedure(Guid.NewGuid(), CreateDraftRequest(), CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(create.Result);
        Assert.IsType<OkObjectResult>(update.Result);
        Assert.IsType<NoContentResult>(delete);
        Assert.IsType<OkObjectResult>(transition.Result);
        Assert.IsType<OkObjectResult>(upsertMilestones.Result);
        Assert.IsType<OkObjectResult>(upsertControlPoints.Result);
        Assert.IsType<OkObjectResult>(upsertMdrCards.Result);
        Assert.IsType<OkObjectResult>(importForecastFact.Result);
        Assert.IsType<CreatedAtActionResult>(createDraftFromProcedure.Result);
    }

    [Fact]
    public async Task MutationEndpoints_WhenContractMissing_ShouldReturnNotFound()
    {
        var service = new StubContractsService
        {
            UpdateAsyncHandler = (_, _, _) => Task.FromResult<ContractDetailsDto?>(null),
            DeleteAsyncHandler = (_, _) => Task.FromResult(false),
            TransitionAsyncHandler = (_, _, _) => Task.FromResult<ContractStatusHistoryItemDto?>(null),
            UpsertMilestonesAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            UpsertMonitoringControlPointsAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            UpsertMdrCardsAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            ImportMdrForecastFactAsyncHandler = (_, _, _) => throw new KeyNotFoundException()
        };
        var controller = new ContractsController(service);
        var contractId = Guid.NewGuid();

        var update = await controller.Update(contractId, UpdateRequest(), CancellationToken.None);
        var delete = await controller.Delete(contractId, CancellationToken.None);
        var transition = await controller.Transition(contractId, TransitionRequest(), CancellationToken.None);
        var upsertMilestones = await controller.UpsertMilestones(contractId, MilestonesRequest(), CancellationToken.None);
        var upsertControlPoints = await controller.UpsertMonitoringControlPoints(contractId, MonitoringControlPointsRequest(), CancellationToken.None);
        var upsertMdrCards = await controller.UpsertMdrCards(contractId, MdrCardsRequest(), CancellationToken.None);
        var importForecastFact = await controller.ImportMdrForecastFact(contractId, ImportRequest(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(update.Result);
        Assert.IsType<NotFoundResult>(delete);
        Assert.IsType<NotFoundResult>(transition.Result);
        Assert.IsType<NotFoundResult>(upsertMilestones.Result);
        Assert.IsType<NotFoundResult>(upsertControlPoints.Result);
        Assert.IsType<NotFoundResult>(upsertMdrCards.Result);
        Assert.IsType<NotFoundResult>(importForecastFact.Result);
    }

    [Fact]
    public async Task MutationEndpoints_WhenServiceThrowsInvalidOperation_ShouldReturnConflictProblems()
    {
        var service = new StubContractsService
        {
            CreateAsyncHandler = (_, _) => throw new InvalidOperationException("Create conflict."),
            UpdateAsyncHandler = (_, _, _) => throw new InvalidOperationException("Update conflict."),
            TransitionAsyncHandler = (_, _, _) => throw new InvalidOperationException("Transition conflict."),
            UpsertMilestonesAsyncHandler = (_, _, _) => throw new InvalidOperationException("Milestones conflict."),
            UpsertMonitoringControlPointsAsyncHandler = (_, _, _) => throw new InvalidOperationException("Control points conflict."),
            UpsertMdrCardsAsyncHandler = (_, _, _) => throw new InvalidOperationException("MDR cards conflict."),
            ImportMdrForecastFactAsyncHandler = (_, _, _) => throw new InvalidOperationException("Import conflict."),
            CreateDraftFromProcedureAsyncHandler = (_, _, _) => throw new InvalidOperationException("Draft creation conflict.")
        };
        var controller = new ContractsController(service);
        var contractId = Guid.NewGuid();

        var create = await controller.Create(CreateRequest(), CancellationToken.None);
        var update = await controller.Update(contractId, UpdateRequest(), CancellationToken.None);
        var transition = await controller.Transition(contractId, TransitionRequest(), CancellationToken.None);
        var upsertMilestones = await controller.UpsertMilestones(contractId, MilestonesRequest(), CancellationToken.None);
        var upsertControlPoints = await controller.UpsertMonitoringControlPoints(contractId, MonitoringControlPointsRequest(), CancellationToken.None);
        var upsertMdrCards = await controller.UpsertMdrCards(contractId, MdrCardsRequest(), CancellationToken.None);
        var importForecastFact = await controller.ImportMdrForecastFact(contractId, ImportRequest(), CancellationToken.None);
        var createDraft = await controller.CreateDraftFromProcedure(Guid.NewGuid(), CreateDraftRequest(), CancellationToken.None);

        AssertConflict(create.Result);
        AssertConflict(update.Result);
        AssertConflict(transition.Result);
        AssertConflict(upsertMilestones.Result);
        AssertConflict(upsertControlPoints.Result);
        AssertConflict(upsertMdrCards.Result);
        AssertConflict(importForecastFact.Result);
        AssertConflict(createDraft.Result);
    }

    [Fact]
    public async Task MutationEndpoints_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblems()
    {
        var service = new StubContractsService
        {
            CreateAsyncHandler = (_, _) => throw new ArgumentException("Invalid create payload."),
            UpdateAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid update payload."),
            TransitionAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid transition payload."),
            UpsertMilestonesAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid milestones payload."),
            UpsertMonitoringControlPointsAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid control points payload."),
            UpsertMdrCardsAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid MDR payload."),
            ImportMdrForecastFactAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid import payload."),
            CreateDraftFromProcedureAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid draft payload.")
        };
        var controller = new ContractsController(service);
        var contractId = Guid.NewGuid();

        var create = await controller.Create(CreateRequest(), CancellationToken.None);
        var update = await controller.Update(contractId, UpdateRequest(), CancellationToken.None);
        var transition = await controller.Transition(contractId, TransitionRequest(), CancellationToken.None);
        var upsertMilestones = await controller.UpsertMilestones(contractId, MilestonesRequest(), CancellationToken.None);
        var upsertControlPoints = await controller.UpsertMonitoringControlPoints(contractId, MonitoringControlPointsRequest(), CancellationToken.None);
        var upsertMdrCards = await controller.UpsertMdrCards(contractId, MdrCardsRequest(), CancellationToken.None);
        var importForecastFact = await controller.ImportMdrForecastFact(contractId, ImportRequest(), CancellationToken.None);
        var createDraft = await controller.CreateDraftFromProcedure(Guid.NewGuid(), CreateDraftRequest(), CancellationToken.None);

        AssertBadRequest(create.Result);
        AssertBadRequest(update.Result);
        AssertBadRequest(transition.Result);
        AssertBadRequest(upsertMilestones.Result);
        AssertBadRequest(upsertControlPoints.Result);
        AssertBadRequest(upsertMdrCards.Result);
        AssertBadRequest(importForecastFact.Result);
        AssertBadRequest(createDraft.Result);
    }

    private static void AssertConflict(IActionResult? result)
    {
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
    }

    private static void AssertBadRequest(IActionResult? result)
    {
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
    }

    private static CreateContractRequest CreateRequest()
    {
        return new CreateContractRequest
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = "CTR-BR-001",
            SigningDate = DateTime.UtcNow.Date,
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(30),
            Status = ContractStatus.Draft
        };
    }

    private static UpdateContractRequest UpdateRequest()
    {
        return new UpdateContractRequest
        {
            ContractNumber = "CTR-BR-UPDATED",
            SigningDate = DateTime.UtcNow.Date,
            AmountWithoutVat = 200m,
            VatAmount = 40m,
            TotalAmount = 240m,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(60),
            Status = ContractStatus.OnApproval
        };
    }

    private static ContractStatusTransitionRequest TransitionRequest()
    {
        return new ContractStatusTransitionRequest
        {
            TargetStatus = ContractStatus.Active,
            Reason = "Transition"
        };
    }

    private static UpdateContractMilestonesRequest MilestonesRequest()
    {
        return new UpdateContractMilestonesRequest
        {
            Items =
            [
                new UpsertContractMilestoneItemRequest
                {
                    Title = "Milestone 1",
                    PlannedDate = DateTime.UtcNow.Date,
                    ProgressPercent = 50m,
                    SortOrder = 0
                }
            ]
        };
    }

    private static UpdateContractMonitoringControlPointsRequest MonitoringControlPointsRequest()
    {
        return new UpdateContractMonitoringControlPointsRequest
        {
            Items =
            [
                new UpsertContractMonitoringControlPointItemRequest
                {
                    Name = "CP-1",
                    PlannedDate = DateTime.UtcNow.Date,
                    ProgressPercent = 30m,
                    SortOrder = 0,
                    Stages =
                    [
                        new UpsertContractMonitoringControlPointStageItemRequest
                        {
                            Name = "Stage-1",
                            PlannedDate = DateTime.UtcNow.Date,
                            ProgressPercent = 20m,
                            SortOrder = 0
                        }
                    ]
                }
            ]
        };
    }

    private static UpdateContractMdrCardsRequest MdrCardsRequest()
    {
        return new UpdateContractMdrCardsRequest
        {
            Items =
            [
                new UpsertContractMdrCardItemRequest
                {
                    Title = "MDR",
                    ReportingDate = DateTime.UtcNow.Date,
                    SortOrder = 0,
                    Rows =
                    [
                        new UpsertContractMdrRowItemRequest
                        {
                            RowCode = "ROW-1",
                            Description = "Row",
                            UnitCode = "MH",
                            PlanValue = 10m,
                            ForecastValue = 12m,
                            FactValue = 8m,
                            SortOrder = 0
                        }
                    ]
                }
            ]
        };
    }

    private static ImportContractMdrForecastFactRequest ImportRequest()
    {
        return new ImportContractMdrForecastFactRequest
        {
            SkipConflicts = true,
            Items =
            [
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 1,
                    CardTitle = "MDR",
                    ReportingDate = DateTime.UtcNow.Date,
                    RowCode = "ROW-1",
                    ForecastValue = 12m,
                    FactValue = 8m
                }
            ]
        };
    }

    private static CreateContractDraftFromProcedureRequest CreateDraftRequest()
    {
        return new CreateContractDraftFromProcedureRequest
        {
            ContractNumber = "CTR-DR-001",
            SigningDate = DateTime.UtcNow.Date,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(30)
        };
    }

    private static ContractListItemDto CreateListItem()
    {
        return new ContractListItemDto(
            Guid.NewGuid(),
            "CTR-BR-001",
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Contractor",
            ContractStatus.Draft,
            DateTime.UtcNow.Date,
            100m,
            20m,
            120m,
            DateTime.UtcNow.Date,
            DateTime.UtcNow.Date.AddDays(30));
    }

    private static ContractDetailsDto CreateDetails(Guid? id = null)
    {
        return new ContractDetailsDto(
            id ?? Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Contractor",
            "CTR-BR-001",
            DateTime.UtcNow.Date,
            100m,
            20m,
            120m,
            DateTime.UtcNow.Date,
            DateTime.UtcNow.Date.AddDays(30),
            ContractStatus.Draft);
    }

    private static ContractStatusHistoryItemDto CreateHistoryItem()
    {
        return new ContractStatusHistoryItemDto(
            Guid.NewGuid(),
            ContractStatus.Draft,
            ContractStatus.OnApproval,
            "Transition",
            "tester",
            DateTimeOffset.UtcNow);
    }

    private static ContractExecutionSummaryDto CreateExecutionSummary()
    {
        return new ContractExecutionSummaryDto(
            Guid.NewGuid(),
            3,
            1,
            33.3m,
            1,
            DateTime.UtcNow.Date.AddDays(5));
    }

    private static ContractMilestoneDto CreateMilestone()
    {
        return new ContractMilestoneDto(
            Guid.NewGuid(),
            "Milestone 1",
            DateTime.UtcNow.Date,
            null,
            50m,
            0,
            null,
            false);
    }

    private static ContractMonitoringControlPointDto CreateControlPoint()
    {
        return new ContractMonitoringControlPointDto(
            Guid.NewGuid(),
            "CP-1",
            "Role",
            DateTime.UtcNow.Date,
            null,
            null,
            30m,
            0,
            null,
            false,
            new[]
            {
                new ContractMonitoringControlPointStageDto(
                    Guid.NewGuid(),
                    "Stage-1",
                    DateTime.UtcNow.Date,
                    null,
                    null,
                    20m,
                    0,
                    null,
                    false)
            });
    }

    private static ContractMdrCardDto CreateMdrCard()
    {
        return new ContractMdrCardDto(
            Guid.NewGuid(),
            "MDR",
            DateTime.UtcNow.Date,
            0,
            null,
            10m,
            12m,
            8m,
            20m,
            -20m,
            new[]
            {
                new ContractMdrRowDto(
                    Guid.NewGuid(),
                    "ROW-1",
                    "Row",
                    "MH",
                    10m,
                    12m,
                    8m,
                    20m,
                    -20m,
                    0,
                    null)
            });
    }

    private static ImportContractMdrForecastFactResultDto CreateImportResult()
    {
        return new ImportContractMdrForecastFactResultDto(
            true,
            1,
            1,
            0,
            Array.Empty<ImportContractMdrForecastFactConflictDto>(),
            new[] { CreateMdrCard() });
    }

    private sealed class StubContractsService : IContractsService
    {
        public Func<string?, ContractStatus?, Guid?, Guid?, Guid?, CancellationToken, Task<IReadOnlyList<ContractListItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _, _, _, _, _) => Task.FromResult<IReadOnlyList<ContractListItemDto>>(new[] { CreateListItem() });

        public Func<string?, ContractStatus?, Guid?, Guid?, Guid?, int, int, CancellationToken, Task<ContractListPageDto>> ListPageAsyncHandler { get; set; } =
            static (_, _, _, _, _, skip, take, _) => Task.FromResult(new ContractListPageDto(new[] { CreateListItem() }, 1, skip, take));

        public Func<Guid, CancellationToken, Task<ContractDetailsDto?>> GetByIdAsyncHandler { get; set; } =
            static (id, _) => Task.FromResult<ContractDetailsDto?>(CreateDetails(id));

        public Func<CreateContractRequest, CancellationToken, Task<ContractDetailsDto>> CreateAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateDetails());

        public Func<Guid, UpdateContractRequest, CancellationToken, Task<ContractDetailsDto?>> UpdateAsyncHandler { get; set; } =
            static (id, _, _) => Task.FromResult<ContractDetailsDto?>(CreateDetails(id));

        public Func<Guid, CancellationToken, Task<bool>> DeleteAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(true);

        public Func<Guid, ContractStatusTransitionRequest, CancellationToken, Task<ContractStatusHistoryItemDto?>> TransitionAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<ContractStatusHistoryItemDto?>(CreateHistoryItem());

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ContractStatusHistoryItemDto>>> GetHistoryAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ContractStatusHistoryItemDto>>(new[] { CreateHistoryItem() });

        public Func<Guid, CancellationToken, Task<ContractExecutionSummaryDto>> GetExecutionSummaryAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateExecutionSummary());

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ContractMilestoneDto>>> GetMilestonesAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ContractMilestoneDto>>(new[] { CreateMilestone() });

        public Func<Guid, UpdateContractMilestonesRequest, CancellationToken, Task<IReadOnlyList<ContractMilestoneDto>>> UpsertMilestonesAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ContractMilestoneDto>>(new[] { CreateMilestone() });

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ContractMonitoringControlPointDto>>> GetMonitoringControlPointsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ContractMonitoringControlPointDto>>(new[] { CreateControlPoint() });

        public Func<Guid, UpdateContractMonitoringControlPointsRequest, CancellationToken, Task<IReadOnlyList<ContractMonitoringControlPointDto>>> UpsertMonitoringControlPointsAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ContractMonitoringControlPointDto>>(new[] { CreateControlPoint() });

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ContractMdrCardDto>>> GetMdrCardsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ContractMdrCardDto>>(new[] { CreateMdrCard() });

        public Func<Guid, UpdateContractMdrCardsRequest, CancellationToken, Task<IReadOnlyList<ContractMdrCardDto>>> UpsertMdrCardsAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ContractMdrCardDto>>(new[] { CreateMdrCard() });

        public Func<Guid, ImportContractMdrForecastFactRequest, CancellationToken, Task<ImportContractMdrForecastFactResultDto>> ImportMdrForecastFactAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(CreateImportResult());

        public Func<Guid, CreateContractDraftFromProcedureRequest, CancellationToken, Task<ContractDetailsDto>> CreateDraftFromProcedureAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(CreateDetails());

        public Task<IReadOnlyList<ContractListItemDto>> ListAsync(
            string? search,
            ContractStatus? status,
            Guid? lotId,
            Guid? procedureId,
            Guid? contractorId,
            CancellationToken cancellationToken = default)
            => ListAsyncHandler(search, status, lotId, procedureId, contractorId, cancellationToken);

        public Task<ContractListPageDto> ListPageAsync(
            string? search,
            ContractStatus? status,
            Guid? lotId,
            Guid? procedureId,
            Guid? contractorId,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
            => ListPageAsyncHandler(search, status, lotId, procedureId, contractorId, skip, take, cancellationToken);

        public Task<ContractDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetByIdAsyncHandler(id, cancellationToken);

        public Task<ContractDetailsDto> CreateAsync(CreateContractRequest request, CancellationToken cancellationToken = default)
            => CreateAsyncHandler(request, cancellationToken);

        public Task<ContractDetailsDto?> UpdateAsync(Guid id, UpdateContractRequest request, CancellationToken cancellationToken = default)
            => UpdateAsyncHandler(id, request, cancellationToken);

        public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
            => DeleteAsyncHandler(id, cancellationToken);

        public Task<ContractStatusHistoryItemDto?> TransitionAsync(
            Guid id,
            ContractStatusTransitionRequest request,
            CancellationToken cancellationToken = default)
            => TransitionAsyncHandler(id, request, cancellationToken);

        public Task<IReadOnlyList<ContractStatusHistoryItemDto>> GetHistoryAsync(Guid contractId, CancellationToken cancellationToken = default)
            => GetHistoryAsyncHandler(contractId, cancellationToken);

        public Task<ContractExecutionSummaryDto> GetExecutionSummaryAsync(Guid contractId, CancellationToken cancellationToken = default)
            => GetExecutionSummaryAsyncHandler(contractId, cancellationToken);

        public Task<IReadOnlyList<ContractMilestoneDto>> GetMilestonesAsync(Guid contractId, CancellationToken cancellationToken = default)
            => GetMilestonesAsyncHandler(contractId, cancellationToken);

        public Task<IReadOnlyList<ContractMilestoneDto>> UpsertMilestonesAsync(
            Guid contractId,
            UpdateContractMilestonesRequest request,
            CancellationToken cancellationToken = default)
            => UpsertMilestonesAsyncHandler(contractId, request, cancellationToken);

        public Task<IReadOnlyList<ContractMonitoringControlPointDto>> GetMonitoringControlPointsAsync(
            Guid contractId,
            CancellationToken cancellationToken = default)
            => GetMonitoringControlPointsAsyncHandler(contractId, cancellationToken);

        public Task<IReadOnlyList<ContractMonitoringControlPointDto>> UpsertMonitoringControlPointsAsync(
            Guid contractId,
            UpdateContractMonitoringControlPointsRequest request,
            CancellationToken cancellationToken = default)
            => UpsertMonitoringControlPointsAsyncHandler(contractId, request, cancellationToken);

        public Task<IReadOnlyList<ContractMdrCardDto>> GetMdrCardsAsync(
            Guid contractId,
            CancellationToken cancellationToken = default)
            => GetMdrCardsAsyncHandler(contractId, cancellationToken);

        public Task<IReadOnlyList<ContractMdrCardDto>> UpsertMdrCardsAsync(
            Guid contractId,
            UpdateContractMdrCardsRequest request,
            CancellationToken cancellationToken = default)
            => UpsertMdrCardsAsyncHandler(contractId, request, cancellationToken);

        public Task<ImportContractMdrForecastFactResultDto> ImportMdrForecastFactAsync(
            Guid contractId,
            ImportContractMdrForecastFactRequest request,
            CancellationToken cancellationToken = default)
            => ImportMdrForecastFactAsyncHandler(contractId, request, cancellationToken);

        public Task<ContractDetailsDto> CreateDraftFromProcedureAsync(
            Guid procedureId,
            CreateContractDraftFromProcedureRequest request,
            CancellationToken cancellationToken = default)
            => CreateDraftFromProcedureAsyncHandler(procedureId, request, cancellationToken);
    }
}
