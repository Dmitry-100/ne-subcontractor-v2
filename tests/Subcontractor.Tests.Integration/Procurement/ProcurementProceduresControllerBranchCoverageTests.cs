using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Procurement;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcurementProceduresControllerBranchCoverageTests
{
    [Fact]
    public async Task List_ShouldSwitchBetweenLegacyAndPagedContracts()
    {
        var service = new StubProcurementProceduresService();
        var controller = new ProcurementProceduresController(service);

        var legacyResult = await controller.List(
            search: "legacy",
            status: ProcurementProcedureStatus.Created,
            lotId: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);
        var pageResult = await controller.List(
            search: "page",
            status: ProcurementProcedureStatus.OnApproval,
            lotId: Guid.NewGuid(),
            skip: 0,
            take: 15,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var legacyOk = Assert.IsType<OkObjectResult>(legacyResult);
        Assert.IsAssignableFrom<IReadOnlyList<ProcedureListItemDto>>(legacyOk.Value);

        var pageOk = Assert.IsType<OkObjectResult>(pageResult);
        Assert.IsType<ProcedureListPageDto>(pageOk.Value);
    }

    [Fact]
    public async Task ReadEndpoints_ShouldReturnOkPayloads()
    {
        var service = new StubProcurementProceduresService();
        var controller = new ProcurementProceduresController(service);
        var procedureId = Guid.NewGuid();

        var getById = await controller.GetById(procedureId, CancellationToken.None);
        var history = await controller.History(procedureId, CancellationToken.None);
        var approvalSteps = await controller.GetApprovalSteps(procedureId, CancellationToken.None);
        var externalApproval = await controller.GetExternalApproval(procedureId, CancellationToken.None);
        var shortlist = await controller.GetShortlist(procedureId, CancellationToken.None);
        var shortlistRecommendations = await controller.GetShortlistRecommendations(procedureId, CancellationToken.None);
        var shortlistAdjustments = await controller.GetShortlistAdjustments(procedureId, CancellationToken.None);
        var offers = await controller.GetOffers(procedureId, CancellationToken.None);
        var comparison = await controller.GetComparison(procedureId, CancellationToken.None);
        var outcome = await controller.GetOutcome(procedureId, CancellationToken.None);

        Assert.IsType<OkObjectResult>(getById.Result);
        Assert.IsType<OkObjectResult>(history.Result);
        Assert.IsType<OkObjectResult>(approvalSteps.Result);
        Assert.IsType<OkObjectResult>(externalApproval.Result);
        Assert.IsType<OkObjectResult>(shortlist.Result);
        Assert.IsType<OkObjectResult>(shortlistRecommendations.Result);
        Assert.IsType<OkObjectResult>(shortlistAdjustments.Result);
        Assert.IsType<OkObjectResult>(offers.Result);
        Assert.IsType<OkObjectResult>(comparison.Result);
        Assert.IsType<OkObjectResult>(outcome.Result);
    }

    [Fact]
    public async Task ReadEndpoints_WhenProcedureMissing_ShouldReturnNotFound()
    {
        var service = new StubProcurementProceduresService
        {
            GetByIdAsyncHandler = (_, _) => Task.FromResult<ProcedureDetailsDto?>(null),
            GetApprovalStepsAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetExternalApprovalAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetShortlistAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            BuildShortlistRecommendationsAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetShortlistAdjustmentsAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetOffersAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetComparisonAsyncHandler = (_, _) => throw new KeyNotFoundException(),
            GetOutcomeAsyncHandler = (_, _) => throw new KeyNotFoundException()
        };
        var controller = new ProcurementProceduresController(service);
        var procedureId = Guid.NewGuid();

        var getById = await controller.GetById(procedureId, CancellationToken.None);
        var approvalSteps = await controller.GetApprovalSteps(procedureId, CancellationToken.None);
        var externalApproval = await controller.GetExternalApproval(procedureId, CancellationToken.None);
        var shortlist = await controller.GetShortlist(procedureId, CancellationToken.None);
        var shortlistRecommendations = await controller.GetShortlistRecommendations(procedureId, CancellationToken.None);
        var shortlistAdjustments = await controller.GetShortlistAdjustments(procedureId, CancellationToken.None);
        var offers = await controller.GetOffers(procedureId, CancellationToken.None);
        var comparison = await controller.GetComparison(procedureId, CancellationToken.None);
        var outcome = await controller.GetOutcome(procedureId, CancellationToken.None);

        Assert.IsType<NotFoundResult>(getById.Result);
        Assert.IsType<NotFoundResult>(approvalSteps.Result);
        Assert.IsType<NotFoundResult>(externalApproval.Result);
        Assert.IsType<NotFoundResult>(shortlist.Result);
        Assert.IsType<NotFoundResult>(shortlistRecommendations.Result);
        Assert.IsType<NotFoundResult>(shortlistAdjustments.Result);
        Assert.IsType<NotFoundResult>(offers.Result);
        Assert.IsType<NotFoundResult>(comparison.Result);
        Assert.IsType<NotFoundResult>(outcome.Result);
    }

    [Fact]
    public async Task MutationEndpoints_ShouldReturnSuccessResults()
    {
        var service = new StubProcurementProceduresService();
        var controller = new ProcurementProceduresController(service);
        var procedureId = Guid.NewGuid();
        var stepId = Guid.NewGuid();

        var create = await controller.Create(CreateRequest(), CancellationToken.None);
        var update = await controller.Update(procedureId, UpdateRequest(), CancellationToken.None);
        var delete = await controller.Delete(procedureId, CancellationToken.None);
        var transition = await controller.Transition(procedureId, TransitionRequest(), CancellationToken.None);
        var configureApprovalSteps = await controller.ConfigureApprovalSteps(procedureId, ConfigureApprovalRequest(), CancellationToken.None);
        var decideStep = await controller.DecideApprovalStep(procedureId, stepId, DecideApprovalRequest(), CancellationToken.None);
        var upsertExternalApproval = await controller.UpsertExternalApproval(procedureId, UpsertExternalApprovalRequest(), CancellationToken.None);
        var upsertShortlist = await controller.UpsertShortlist(procedureId, UpdateShortlistRequest(), CancellationToken.None);
        var applyShortlist = await controller.ApplyShortlistRecommendations(procedureId, ApplyShortlistRequest(), CancellationToken.None);
        var upsertOffers = await controller.UpsertOffers(procedureId, UpdateOffersRequest(), CancellationToken.None);
        var upsertOutcome = await controller.UpsertOutcome(procedureId, UpdateOutcomeRequest(), CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(create.Result);
        Assert.IsType<OkObjectResult>(update.Result);
        Assert.IsType<NoContentResult>(delete);
        Assert.IsType<OkObjectResult>(transition.Result);
        Assert.IsType<OkObjectResult>(configureApprovalSteps.Result);
        Assert.IsType<OkObjectResult>(decideStep.Result);
        Assert.IsType<OkObjectResult>(upsertExternalApproval.Result);
        Assert.IsType<OkObjectResult>(upsertShortlist.Result);
        Assert.IsType<OkObjectResult>(applyShortlist.Result);
        Assert.IsType<OkObjectResult>(upsertOffers.Result);
        Assert.IsType<OkObjectResult>(upsertOutcome.Result);
    }

    [Fact]
    public async Task MutationEndpoints_WhenProcedureMissing_ShouldReturnNotFound()
    {
        var service = new StubProcurementProceduresService
        {
            UpdateAsyncHandler = (_, _, _) => Task.FromResult<ProcedureDetailsDto?>(null),
            DeleteAsyncHandler = (_, _) => Task.FromResult(false),
            TransitionAsyncHandler = (_, _, _) => Task.FromResult<ProcedureStatusHistoryItemDto?>(null),
            ConfigureApprovalStepsAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            DecideApprovalStepAsyncHandler = (_, _, _, _) => Task.FromResult<ProcedureApprovalStepDto?>(null),
            UpsertExternalApprovalAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            UpsertShortlistAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            ApplyShortlistRecommendationsAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            UpsertOffersAsyncHandler = (_, _, _) => throw new KeyNotFoundException(),
            UpsertOutcomeAsyncHandler = (_, _, _) => throw new KeyNotFoundException()
        };
        var controller = new ProcurementProceduresController(service);
        var procedureId = Guid.NewGuid();
        var stepId = Guid.NewGuid();

        var update = await controller.Update(procedureId, UpdateRequest(), CancellationToken.None);
        var delete = await controller.Delete(procedureId, CancellationToken.None);
        var transition = await controller.Transition(procedureId, TransitionRequest(), CancellationToken.None);
        var configureApprovalSteps = await controller.ConfigureApprovalSteps(procedureId, ConfigureApprovalRequest(), CancellationToken.None);
        var decideStep = await controller.DecideApprovalStep(procedureId, stepId, DecideApprovalRequest(), CancellationToken.None);
        var upsertExternalApproval = await controller.UpsertExternalApproval(procedureId, UpsertExternalApprovalRequest(), CancellationToken.None);
        var upsertShortlist = await controller.UpsertShortlist(procedureId, UpdateShortlistRequest(), CancellationToken.None);
        var applyShortlist = await controller.ApplyShortlistRecommendations(procedureId, ApplyShortlistRequest(), CancellationToken.None);
        var upsertOffers = await controller.UpsertOffers(procedureId, UpdateOffersRequest(), CancellationToken.None);
        var upsertOutcome = await controller.UpsertOutcome(procedureId, UpdateOutcomeRequest(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(update.Result);
        Assert.IsType<NotFoundResult>(delete);
        Assert.IsType<NotFoundResult>(transition.Result);
        Assert.IsType<NotFoundResult>(configureApprovalSteps.Result);
        Assert.IsType<NotFoundResult>(decideStep.Result);
        Assert.IsType<NotFoundResult>(upsertExternalApproval.Result);
        Assert.IsType<NotFoundResult>(upsertShortlist.Result);
        Assert.IsType<NotFoundResult>(applyShortlist.Result);
        Assert.IsType<NotFoundResult>(upsertOffers.Result);
        Assert.IsType<NotFoundResult>(upsertOutcome.Result);
    }

    [Fact]
    public async Task MutationEndpoints_WhenServiceThrowsInvalidOperation_ShouldReturnConflictProblem()
    {
        var service = new StubProcurementProceduresService
        {
            CreateAsyncHandler = (_, _) => throw new InvalidOperationException("Create conflict."),
            UpdateAsyncHandler = (_, _, _) => throw new InvalidOperationException("Update conflict."),
            DeleteAsyncHandler = (_, _) => throw new InvalidOperationException("Delete conflict."),
            TransitionAsyncHandler = (_, _, _) => throw new InvalidOperationException("Transition conflict."),
            ConfigureApprovalStepsAsyncHandler = (_, _, _) => throw new InvalidOperationException("Configure approval conflict."),
            DecideApprovalStepAsyncHandler = (_, _, _, _) => throw new InvalidOperationException("Approval decision conflict."),
            UpsertExternalApprovalAsyncHandler = (_, _, _) => throw new InvalidOperationException("External approval conflict."),
            UpsertShortlistAsyncHandler = (_, _, _) => throw new InvalidOperationException("Shortlist conflict."),
            BuildShortlistRecommendationsAsyncHandler = (_, _) => throw new InvalidOperationException("Recommendation conflict."),
            ApplyShortlistRecommendationsAsyncHandler = (_, _, _) => throw new InvalidOperationException("Apply shortlist conflict."),
            UpsertOffersAsyncHandler = (_, _, _) => throw new InvalidOperationException("Offers conflict."),
            UpsertOutcomeAsyncHandler = (_, _, _) => throw new InvalidOperationException("Outcome conflict.")
        };
        var controller = new ProcurementProceduresController(service);
        var procedureId = Guid.NewGuid();
        var stepId = Guid.NewGuid();

        var create = await controller.Create(CreateRequest(), CancellationToken.None);
        var update = await controller.Update(procedureId, UpdateRequest(), CancellationToken.None);
        var delete = await controller.Delete(procedureId, CancellationToken.None);
        var transition = await controller.Transition(procedureId, TransitionRequest(), CancellationToken.None);
        var configureApprovalSteps = await controller.ConfigureApprovalSteps(procedureId, ConfigureApprovalRequest(), CancellationToken.None);
        var decideStep = await controller.DecideApprovalStep(procedureId, stepId, DecideApprovalRequest(), CancellationToken.None);
        var upsertExternalApproval = await controller.UpsertExternalApproval(procedureId, UpsertExternalApprovalRequest(), CancellationToken.None);
        var upsertShortlist = await controller.UpsertShortlist(procedureId, UpdateShortlistRequest(), CancellationToken.None);
        var shortlistRecommendations = await controller.GetShortlistRecommendations(procedureId, CancellationToken.None);
        var applyShortlist = await controller.ApplyShortlistRecommendations(procedureId, ApplyShortlistRequest(), CancellationToken.None);
        var upsertOffers = await controller.UpsertOffers(procedureId, UpdateOffersRequest(), CancellationToken.None);
        var upsertOutcome = await controller.UpsertOutcome(procedureId, UpdateOutcomeRequest(), CancellationToken.None);

        AssertConflict(create.Result);
        AssertConflict(update.Result);
        AssertConflict(delete);
        AssertConflict(transition.Result);
        AssertConflict(configureApprovalSteps.Result);
        AssertConflict(decideStep.Result);
        AssertConflict(upsertExternalApproval.Result);
        AssertConflict(upsertShortlist.Result);
        AssertConflict(shortlistRecommendations.Result);
        AssertConflict(applyShortlist.Result);
        AssertConflict(upsertOffers.Result);
        AssertConflict(upsertOutcome.Result);
    }

    [Fact]
    public async Task MutationEndpoints_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubProcurementProceduresService
        {
            CreateAsyncHandler = (_, _) => throw new ArgumentException("Invalid create request."),
            UpdateAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid update request."),
            TransitionAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid transition request."),
            ConfigureApprovalStepsAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid approval config."),
            DecideApprovalStepAsyncHandler = (_, _, _, _) => throw new ArgumentException("Invalid approval decision."),
            UpsertExternalApprovalAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid external approval payload."),
            UpsertShortlistAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid shortlist payload."),
            ApplyShortlistRecommendationsAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid shortlist apply payload."),
            UpsertOffersAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid offers payload."),
            UpsertOutcomeAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid outcome payload.")
        };
        var controller = new ProcurementProceduresController(service);
        var procedureId = Guid.NewGuid();
        var stepId = Guid.NewGuid();

        var create = await controller.Create(CreateRequest(), CancellationToken.None);
        var update = await controller.Update(procedureId, UpdateRequest(), CancellationToken.None);
        var transition = await controller.Transition(procedureId, TransitionRequest(), CancellationToken.None);
        var configureApprovalSteps = await controller.ConfigureApprovalSteps(procedureId, ConfigureApprovalRequest(), CancellationToken.None);
        var decideStep = await controller.DecideApprovalStep(procedureId, stepId, DecideApprovalRequest(), CancellationToken.None);
        var upsertExternalApproval = await controller.UpsertExternalApproval(procedureId, UpsertExternalApprovalRequest(), CancellationToken.None);
        var upsertShortlist = await controller.UpsertShortlist(procedureId, UpdateShortlistRequest(), CancellationToken.None);
        var applyShortlist = await controller.ApplyShortlistRecommendations(procedureId, ApplyShortlistRequest(), CancellationToken.None);
        var upsertOffers = await controller.UpsertOffers(procedureId, UpdateOffersRequest(), CancellationToken.None);
        var upsertOutcome = await controller.UpsertOutcome(procedureId, UpdateOutcomeRequest(), CancellationToken.None);

        AssertBadRequest(create.Result);
        AssertBadRequest(update.Result);
        AssertBadRequest(transition.Result);
        AssertBadRequest(configureApprovalSteps.Result);
        AssertBadRequest(decideStep.Result);
        AssertBadRequest(upsertExternalApproval.Result);
        AssertBadRequest(upsertShortlist.Result);
        AssertBadRequest(applyShortlist.Result);
        AssertBadRequest(upsertOffers.Result);
        AssertBadRequest(upsertOutcome.Result);
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

    private static CreateProcedureRequest CreateRequest()
    {
        return new CreateProcedureRequest
        {
            LotId = Guid.NewGuid(),
            PurchaseTypeCode = "OPEN",
            ObjectName = "Procedure object",
            WorkScope = "Scope",
            CustomerName = "Customer",
            LeadOfficeCode = "MAIN",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5"
        };
    }

    private static UpdateProcedureRequest UpdateRequest()
    {
        return new UpdateProcedureRequest
        {
            PurchaseTypeCode = "OPEN",
            ObjectName = "Updated object",
            WorkScope = "Updated scope",
            CustomerName = "Updated customer",
            LeadOfficeCode = "MAIN",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5"
        };
    }

    private static ProcedureStatusTransitionRequest TransitionRequest()
    {
        return new ProcedureStatusTransitionRequest
        {
            TargetStatus = ProcurementProcedureStatus.OnApproval,
            Reason = "Workflow step"
        };
    }

    private static ConfigureProcedureApprovalRequest ConfigureApprovalRequest()
    {
        return new ConfigureProcedureApprovalRequest
        {
            Steps =
            [
                new ConfigureProcedureApprovalStepRequest
                {
                    StepOrder = 1,
                    StepTitle = "Коммерческий контроль",
                    IsRequired = true
                }
            ]
        };
    }

    private static DecideProcedureApprovalStepRequest DecideApprovalRequest()
    {
        return new DecideProcedureApprovalStepRequest
        {
            DecisionStatus = ProcedureApprovalStepStatus.Approved,
            Comment = "Approved"
        };
    }

    private static UpsertProcedureExternalApprovalRequest UpsertExternalApprovalRequest()
    {
        return new UpsertProcedureExternalApprovalRequest
        {
            IsApproved = true,
            Comment = "External approval completed"
        };
    }

    private static UpdateProcedureShortlistRequest UpdateShortlistRequest()
    {
        return new UpdateProcedureShortlistRequest
        {
            AdjustmentReason = "Manual adjustment",
            Items =
            [
                new UpsertProcedureShortlistItemRequest
                {
                    ContractorId = Guid.NewGuid(),
                    IsIncluded = true,
                    SortOrder = 1
                }
            ]
        };
    }

    private static ApplyProcedureShortlistRecommendationsRequest ApplyShortlistRequest()
    {
        return new ApplyProcedureShortlistRecommendationsRequest
        {
            MaxIncluded = 5,
            AdjustmentReason = "Auto shortlist"
        };
    }

    private static UpdateProcedureOffersRequest UpdateOffersRequest()
    {
        return new UpdateProcedureOffersRequest
        {
            Items =
            [
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = Guid.NewGuid(),
                    OfferNumber = "OFF-1",
                    AmountWithoutVat = 100m,
                    VatAmount = 20m,
                    TotalAmount = 120m
                }
            ]
        };
    }

    private static UpdateProcedureOutcomeRequest UpdateOutcomeRequest()
    {
        return new UpdateProcedureOutcomeRequest
        {
            WinnerContractorId = Guid.NewGuid(),
            DecisionDate = DateTime.UtcNow.Date,
            Comment = "Winner selected"
        };
    }

    private static ProcedureListItemDto CreateListItem()
    {
        return new ProcedureListItemDto(
            Guid.NewGuid(),
            Guid.NewGuid(),
            ProcurementProcedureStatus.Created,
            "OPEN",
            "Procedure item",
            null,
            null,
            DateTime.UtcNow.Date,
            ProcedureApprovalMode.InSystem);
    }

    private static ProcedureDetailsDto CreateDetails(Guid? id = null)
    {
        return new ProcedureDetailsDto(
            id ?? Guid.NewGuid(),
            Guid.NewGuid(),
            ProcurementProcedureStatus.Created,
            DateTime.UtcNow.Date,
            "OPEN",
            null,
            null,
            "Procedure details",
            "Scope",
            "Customer",
            "MAIN",
            "A1",
            "A2",
            "A3",
            "A4",
            "A5",
            null,
            null,
            null,
            null,
            null,
            null,
            ProcedureApprovalMode.InSystem,
            null,
            false,
            false,
            Array.Empty<ProcedureAttachmentDto>());
    }

    private static ProcedureStatusHistoryItemDto CreateHistoryItem()
    {
        return new ProcedureStatusHistoryItemDto(
            Guid.NewGuid(),
            ProcurementProcedureStatus.Created,
            ProcurementProcedureStatus.OnApproval,
            "Transitioned",
            "tester",
            DateTimeOffset.UtcNow);
    }

    private static ProcedureApprovalStepDto CreateApprovalStep(Guid? id = null)
    {
        return new ProcedureApprovalStepDto(
            id ?? Guid.NewGuid(),
            1,
            "Коммерческий контроль",
            null,
            "Commercial",
            true,
            ProcedureApprovalStepStatus.Pending,
            null,
            null,
            null);
    }

    private static ProcedureExternalApprovalDto CreateExternalApproval()
    {
        return new ProcedureExternalApprovalDto(
            Guid.NewGuid(),
            true,
            DateTime.UtcNow.Date,
            Guid.NewGuid(),
            null,
            "Approved");
    }

    private static ProcedureShortlistItemDto CreateShortlistItem()
    {
        return new ProcedureShortlistItemDto(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Contractor One",
            true,
            1,
            null,
            null);
    }

    private static ProcedureShortlistRecommendationDto CreateRecommendation()
    {
        return new ProcedureShortlistRecommendationDto(
            Guid.NewGuid(),
            "Contractor One",
            true,
            1,
            95m,
            ContractorStatus.Active,
            ReliabilityClass.A,
            4.8m,
            12m,
            true,
            Array.Empty<string>(),
            new[] { "rating", "load" });
    }

    private static ProcedureShortlistAdjustmentLogDto CreateAdjustment()
    {
        return new ProcedureShortlistAdjustmentLogDto(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Contractor One",
            true,
            true,
            1,
            1,
            null,
            null,
            "Adjustment",
            "tester",
            DateTimeOffset.UtcNow);
    }

    private static ProcedureOfferDto CreateOffer()
    {
        return new ProcedureOfferDto(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Contractor One",
            "OFF-1",
            DateTime.UtcNow.Date,
            100m,
            20m,
            120m,
            30,
            "RUB",
            ProcedureOfferQualificationStatus.Qualified,
            ProcedureOfferDecisionStatus.Pending,
            null,
            null);
    }

    private static ProcedureComparisonRowDto CreateComparisonRow()
    {
        return new ProcedureComparisonRowDto(
            Guid.NewGuid(),
            "Contractor One",
            true,
            1,
            null,
            Guid.NewGuid(),
            "OFF-1",
            DateTime.UtcNow.Date,
            100m,
            20m,
            120m,
            30,
            "RUB",
            ProcedureOfferQualificationStatus.Qualified,
            ProcedureOfferDecisionStatus.Pending,
            null);
    }

    private static ProcedureOutcomeDto CreateOutcome()
    {
        return new ProcedureOutcomeDto(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Contractor One",
            DateTime.UtcNow.Date,
            null,
            false,
            null,
            "Winner selected");
    }

    private static ApplyProcedureShortlistRecommendationsResultDto CreateAppliedShortlistResult()
    {
        return new ApplyProcedureShortlistRecommendationsResultDto(
            3,
            2,
            new[] { CreateShortlistItem() });
    }

    private sealed class StubProcurementProceduresService : IProcurementProceduresService
    {
        public Func<string?, ProcurementProcedureStatus?, Guid?, CancellationToken, Task<IReadOnlyList<ProcedureListItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _, _, _) => Task.FromResult<IReadOnlyList<ProcedureListItemDto>>(new[] { CreateListItem() });

        public Func<string?, ProcurementProcedureStatus?, Guid?, int, int, CancellationToken, Task<ProcedureListPageDto>> ListPageAsyncHandler { get; set; } =
            static (_, _, _, skip, take, _) => Task.FromResult(new ProcedureListPageDto(new[] { CreateListItem() }, 1, skip, take));

        public Func<Guid, CancellationToken, Task<ProcedureDetailsDto?>> GetByIdAsyncHandler { get; set; } =
            static (id, _) => Task.FromResult<ProcedureDetailsDto?>(CreateDetails(id));

        public Func<CreateProcedureRequest, CancellationToken, Task<ProcedureDetailsDto>> CreateAsyncHandler { get; set; } =
            static (request, _) => Task.FromResult(CreateDetails());

        public Func<Guid, UpdateProcedureRequest, CancellationToken, Task<ProcedureDetailsDto?>> UpdateAsyncHandler { get; set; } =
            static (id, _, _) => Task.FromResult<ProcedureDetailsDto?>(CreateDetails(id));

        public Func<Guid, CancellationToken, Task<bool>> DeleteAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(true);

        public Func<Guid, ProcedureStatusTransitionRequest, CancellationToken, Task<ProcedureStatusHistoryItemDto?>> TransitionAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<ProcedureStatusHistoryItemDto?>(CreateHistoryItem());

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ProcedureStatusHistoryItemDto>>> GetHistoryAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProcedureStatusHistoryItemDto>>(new[] { CreateHistoryItem() });

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ProcedureApprovalStepDto>>> GetApprovalStepsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProcedureApprovalStepDto>>(new[] { CreateApprovalStep() });

        public Func<Guid, ConfigureProcedureApprovalRequest, CancellationToken, Task<IReadOnlyList<ProcedureApprovalStepDto>>> ConfigureApprovalStepsAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ProcedureApprovalStepDto>>(new[] { CreateApprovalStep() });

        public Func<Guid, Guid, DecideProcedureApprovalStepRequest, CancellationToken, Task<ProcedureApprovalStepDto?>> DecideApprovalStepAsyncHandler { get; set; } =
            static (_, stepId, _, _) => Task.FromResult<ProcedureApprovalStepDto?>(CreateApprovalStep(stepId));

        public Func<Guid, CancellationToken, Task<ProcedureExternalApprovalDto>> GetExternalApprovalAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateExternalApproval());

        public Func<Guid, UpsertProcedureExternalApprovalRequest, CancellationToken, Task<ProcedureExternalApprovalDto>> UpsertExternalApprovalAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(CreateExternalApproval());

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ProcedureShortlistItemDto>>> GetShortlistAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProcedureShortlistItemDto>>(new[] { CreateShortlistItem() });

        public Func<Guid, UpdateProcedureShortlistRequest, CancellationToken, Task<IReadOnlyList<ProcedureShortlistItemDto>>> UpsertShortlistAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ProcedureShortlistItemDto>>(new[] { CreateShortlistItem() });

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ProcedureShortlistRecommendationDto>>> BuildShortlistRecommendationsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProcedureShortlistRecommendationDto>>(new[] { CreateRecommendation() });

        public Func<Guid, ApplyProcedureShortlistRecommendationsRequest, CancellationToken, Task<ApplyProcedureShortlistRecommendationsResultDto>> ApplyShortlistRecommendationsAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(CreateAppliedShortlistResult());

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>>> GetShortlistAdjustmentsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>>(new[] { CreateAdjustment() });

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ProcedureOfferDto>>> GetOffersAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProcedureOfferDto>>(new[] { CreateOffer() });

        public Func<Guid, UpdateProcedureOffersRequest, CancellationToken, Task<IReadOnlyList<ProcedureOfferDto>>> UpsertOffersAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ProcedureOfferDto>>(new[] { CreateOffer() });

        public Func<Guid, CancellationToken, Task<IReadOnlyList<ProcedureComparisonRowDto>>> GetComparisonAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ProcedureComparisonRowDto>>(new[] { CreateComparisonRow() });

        public Func<Guid, CancellationToken, Task<ProcedureOutcomeDto>> GetOutcomeAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateOutcome());

        public Func<Guid, UpdateProcedureOutcomeRequest, CancellationToken, Task<ProcedureOutcomeDto>> UpsertOutcomeAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(CreateOutcome());

        public Task<IReadOnlyList<ProcedureListItemDto>> ListAsync(
            string? search,
            ProcurementProcedureStatus? status,
            Guid? lotId,
            CancellationToken cancellationToken = default)
            => ListAsyncHandler(search, status, lotId, cancellationToken);

        public Task<ProcedureListPageDto> ListPageAsync(
            string? search,
            ProcurementProcedureStatus? status,
            Guid? lotId,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
            => ListPageAsyncHandler(search, status, lotId, skip, take, cancellationToken);

        public Task<ProcedureDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetByIdAsyncHandler(id, cancellationToken);

        public Task<ProcedureDetailsDto> CreateAsync(CreateProcedureRequest request, CancellationToken cancellationToken = default)
            => CreateAsyncHandler(request, cancellationToken);

        public Task<ProcedureDetailsDto?> UpdateAsync(Guid id, UpdateProcedureRequest request, CancellationToken cancellationToken = default)
            => UpdateAsyncHandler(id, request, cancellationToken);

        public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
            => DeleteAsyncHandler(id, cancellationToken);

        public Task<ProcedureStatusHistoryItemDto?> TransitionAsync(
            Guid id,
            ProcedureStatusTransitionRequest request,
            CancellationToken cancellationToken = default)
            => TransitionAsyncHandler(id, request, cancellationToken);

        public Task<IReadOnlyList<ProcedureStatusHistoryItemDto>> GetHistoryAsync(Guid procedureId, CancellationToken cancellationToken = default)
            => GetHistoryAsyncHandler(procedureId, cancellationToken);

        public Task<IReadOnlyList<ProcedureApprovalStepDto>> GetApprovalStepsAsync(Guid procedureId, CancellationToken cancellationToken = default)
            => GetApprovalStepsAsyncHandler(procedureId, cancellationToken);

        public Task<IReadOnlyList<ProcedureApprovalStepDto>> ConfigureApprovalStepsAsync(
            Guid procedureId,
            ConfigureProcedureApprovalRequest request,
            CancellationToken cancellationToken = default)
            => ConfigureApprovalStepsAsyncHandler(procedureId, request, cancellationToken);

        public Task<ProcedureApprovalStepDto?> DecideApprovalStepAsync(
            Guid procedureId,
            Guid stepId,
            DecideProcedureApprovalStepRequest request,
            CancellationToken cancellationToken = default)
            => DecideApprovalStepAsyncHandler(procedureId, stepId, request, cancellationToken);

        public Task<ProcedureExternalApprovalDto> GetExternalApprovalAsync(Guid procedureId, CancellationToken cancellationToken = default)
            => GetExternalApprovalAsyncHandler(procedureId, cancellationToken);

        public Task<ProcedureExternalApprovalDto> UpsertExternalApprovalAsync(
            Guid procedureId,
            UpsertProcedureExternalApprovalRequest request,
            CancellationToken cancellationToken = default)
            => UpsertExternalApprovalAsyncHandler(procedureId, request, cancellationToken);

        public Task<IReadOnlyList<ProcedureShortlistItemDto>> GetShortlistAsync(Guid procedureId, CancellationToken cancellationToken = default)
            => GetShortlistAsyncHandler(procedureId, cancellationToken);

        public Task<IReadOnlyList<ProcedureShortlistItemDto>> UpsertShortlistAsync(
            Guid procedureId,
            UpdateProcedureShortlistRequest request,
            CancellationToken cancellationToken = default)
            => UpsertShortlistAsyncHandler(procedureId, request, cancellationToken);

        public Task<IReadOnlyList<ProcedureShortlistRecommendationDto>> BuildShortlistRecommendationsAsync(
            Guid procedureId,
            CancellationToken cancellationToken = default)
            => BuildShortlistRecommendationsAsyncHandler(procedureId, cancellationToken);

        public Task<ApplyProcedureShortlistRecommendationsResultDto> ApplyShortlistRecommendationsAsync(
            Guid procedureId,
            ApplyProcedureShortlistRecommendationsRequest request,
            CancellationToken cancellationToken = default)
            => ApplyShortlistRecommendationsAsyncHandler(procedureId, request, cancellationToken);

        public Task<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>> GetShortlistAdjustmentsAsync(
            Guid procedureId,
            CancellationToken cancellationToken = default)
            => GetShortlistAdjustmentsAsyncHandler(procedureId, cancellationToken);

        public Task<IReadOnlyList<ProcedureOfferDto>> GetOffersAsync(Guid procedureId, CancellationToken cancellationToken = default)
            => GetOffersAsyncHandler(procedureId, cancellationToken);

        public Task<IReadOnlyList<ProcedureOfferDto>> UpsertOffersAsync(
            Guid procedureId,
            UpdateProcedureOffersRequest request,
            CancellationToken cancellationToken = default)
            => UpsertOffersAsyncHandler(procedureId, request, cancellationToken);

        public Task<IReadOnlyList<ProcedureComparisonRowDto>> GetComparisonAsync(Guid procedureId, CancellationToken cancellationToken = default)
            => GetComparisonAsyncHandler(procedureId, cancellationToken);

        public Task<ProcedureOutcomeDto> GetOutcomeAsync(Guid procedureId, CancellationToken cancellationToken = default)
            => GetOutcomeAsyncHandler(procedureId, cancellationToken);

        public Task<ProcedureOutcomeDto> UpsertOutcomeAsync(
            Guid procedureId,
            UpdateProcedureOutcomeRequest request,
            CancellationToken cancellationToken = default)
            => UpsertOutcomeAsyncHandler(procedureId, request, cancellationToken);
    }
}
