using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorsControllerBranchCoverageTests
{
    [Fact]
    public async Task List_ShouldSwitchBetweenLegacyAndPagedContracts()
    {
        var controller = CreateController();

        var legacy = await controller.List(
            search: "legacy",
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);
        var paged = await controller.List(
            search: "paged",
            skip: 0,
            take: 15,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var legacyOk = Assert.IsType<OkObjectResult>(legacy);
        Assert.IsAssignableFrom<IReadOnlyList<ContractorListItemDto>>(legacyOk.Value);

        var pageOk = Assert.IsType<OkObjectResult>(paged);
        Assert.IsType<ContractorListPageDto>(pageOk.Value);
    }

    [Fact]
    public async Task CrudEndpoints_ShouldCoverSuccessAndErrorBranches()
    {
        var contractorsService = new StubContractorsService();
        var controller = CreateController(contractorsService: contractorsService);
        var contractorId = Guid.NewGuid();

        var getById = await controller.GetById(contractorId, CancellationToken.None);
        var create = await controller.Create(CreateRequest(), CancellationToken.None);
        var update = await controller.Update(contractorId, UpdateRequest(), CancellationToken.None);
        var delete = await controller.Delete(contractorId, CancellationToken.None);

        Assert.IsType<OkObjectResult>(getById.Result);
        Assert.IsType<CreatedAtActionResult>(create.Result);
        Assert.IsType<OkObjectResult>(update.Result);
        Assert.IsType<NoContentResult>(delete);

        contractorsService.GetByIdAsyncHandler = (_, _) => Task.FromResult<ContractorDetailsDto?>(null);
        contractorsService.UpdateAsyncHandler = (_, _, _) => Task.FromResult<ContractorDetailsDto?>(null);
        contractorsService.DeleteAsyncHandler = (_, _) => Task.FromResult(false);
        contractorsService.CreateAsyncHandler = (_, _) => throw new InvalidOperationException("Duplicate contractor.");

        var getByIdMissing = await controller.GetById(Guid.NewGuid(), CancellationToken.None);
        var updateMissing = await controller.Update(Guid.NewGuid(), UpdateRequest(), CancellationToken.None);
        var deleteMissing = await controller.Delete(Guid.NewGuid(), CancellationToken.None);
        var createConflict = await controller.Create(CreateRequest(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(getByIdMissing.Result);
        Assert.IsType<NotFoundResult>(updateMissing.Result);
        Assert.IsType<NotFoundResult>(deleteMissing);
        AssertConflict(createConflict.Result);

        contractorsService.CreateAsyncHandler = (_, _) => throw new ArgumentException("Invalid create request.");
        contractorsService.UpdateAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid update request.");

        var createBadRequest = await controller.Create(CreateRequest(), CancellationToken.None);
        var updateBadRequest = await controller.Update(Guid.NewGuid(), UpdateRequest(), CancellationToken.None);

        AssertBadRequest(createBadRequest.Result);
        AssertBadRequest(updateBadRequest.Result);
    }

    [Fact]
    public async Task RecalculateLoad_ShouldReturnOkWithUpdatedCounter()
    {
        var contractorsService = new StubContractorsService
        {
            RecalculateCurrentLoadsAsyncHandler = _ => Task.FromResult(7)
        };
        var controller = CreateController(contractorsService: contractorsService);

        var result = await controller.RecalculateLoad(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task RatingEndpoints_ShouldCoverSuccessAndErrorBranches()
    {
        var ratingsService = new StubContractorRatingsService();
        var controller = CreateController(ratingsService: ratingsService);
        var contractorId = Guid.NewGuid();

        var activeModel = await controller.GetActiveRatingModel(CancellationToken.None);
        var upsertModel = await controller.UpsertActiveRatingModel(new UpsertContractorRatingModelRequest(), CancellationToken.None);
        var recalculateDefault = await controller.RecalculateRatings(null, CancellationToken.None);
        var upsertManual = await controller.UpsertManualAssessment(contractorId, new UpsertContractorRatingManualAssessmentRequest { Score = 4.4m }, CancellationToken.None);
        var history = await controller.GetRatingHistory(contractorId, 25, CancellationToken.None);
        var analytics = await controller.GetRatingAnalytics(CancellationToken.None);

        Assert.IsType<OkObjectResult>(activeModel.Result);
        Assert.IsType<OkObjectResult>(upsertModel.Result);
        Assert.IsType<OkObjectResult>(recalculateDefault.Result);
        Assert.IsType<OkObjectResult>(upsertManual.Result);
        Assert.IsType<OkObjectResult>(history.Result);
        Assert.IsType<OkObjectResult>(analytics.Result);

        ratingsService.UpsertActiveModelAsyncHandler = (_, _) => throw new ArgumentException("Invalid rating model.");
        ratingsService.RecalculateRatingsAsyncHandler = (_, _) => throw new KeyNotFoundException();
        ratingsService.UpsertManualAssessmentAsyncHandler = (_, _, _) => throw new KeyNotFoundException();
        ratingsService.GetHistoryAsyncHandler = (_, _, _) => throw new KeyNotFoundException();

        var upsertModelBadRequest = await controller.UpsertActiveRatingModel(new UpsertContractorRatingModelRequest(), CancellationToken.None);
        var recalculateNotFound = await controller.RecalculateRatings(new RecalculateContractorRatingsRequest(), CancellationToken.None);
        var manualNotFound = await controller.UpsertManualAssessment(contractorId, new UpsertContractorRatingManualAssessmentRequest { Score = 4.1m }, CancellationToken.None);
        var historyNotFound = await controller.GetRatingHistory(contractorId, 25, CancellationToken.None);

        AssertBadRequest(upsertModelBadRequest.Result);
        Assert.IsType<NotFoundResult>(recalculateNotFound.Result);
        Assert.IsType<NotFoundResult>(manualNotFound.Result);
        Assert.IsType<NotFoundResult>(historyNotFound.Result);

        ratingsService.UpsertManualAssessmentAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid manual assessment.");
        var manualBadRequest = await controller.UpsertManualAssessment(contractorId, new UpsertContractorRatingManualAssessmentRequest { Score = 0m }, CancellationToken.None);
        AssertBadRequest(manualBadRequest.Result);
    }

    private static ContractorsController CreateController(
        StubContractorsService? contractorsService = null,
        StubContractorRatingsService? ratingsService = null)
    {
        return new ContractorsController(
            contractorsService ?? new StubContractorsService(),
            ratingsService ?? new StubContractorRatingsService());
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

    private static CreateContractorRequest CreateRequest()
    {
        return new CreateContractorRequest
        {
            Inn = "7703999888",
            Name = "Branch Contractor",
            City = "Moscow",
            ContactName = "Tester",
            Phone = "+70000000000",
            Email = "contractor.branch@test.local",
            CapacityHours = 120m,
            CurrentRating = 4.0m,
            CurrentLoadPercent = 20m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
    }

    private static UpdateContractorRequest UpdateRequest()
    {
        return new UpdateContractorRequest
        {
            Name = "Updated Branch Contractor",
            City = "Moscow",
            ContactName = "Tester",
            Phone = "+70000000000",
            Email = "contractor.branch.updated@test.local",
            CapacityHours = 150m,
            CurrentRating = 4.2m,
            CurrentLoadPercent = 30m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
    }

    private static ContractorDetailsDto CreateContractorDetails(Guid? id = null)
    {
        return new ContractorDetailsDto(
            id ?? Guid.NewGuid(),
            "7703999888",
            "Branch Contractor",
            "Moscow",
            "Tester",
            "+70000000000",
            "contractor.branch@test.local",
            120m,
            4.1m,
            25m,
            null,
            ReliabilityClass.A,
            ContractorStatus.Active,
            Array.Empty<string>());
    }

    private static ContractorListItemDto CreateContractorListItem()
    {
        return new ContractorListItemDto(
            Guid.NewGuid(),
            "7703999888",
            "Branch Contractor",
            "Moscow",
            ContractorStatus.Active,
            ReliabilityClass.A,
            4.1m,
            25m);
    }

    private static ContractorRatingModelDto CreateRatingModel()
    {
        return new ContractorRatingModelDto(
            Guid.NewGuid(),
            "v1",
            "Default model",
            true,
            DateTimeOffset.UtcNow,
            null,
            new[]
            {
                new ContractorRatingWeightDto(ContractorRatingFactorCode.DeliveryDiscipline, 0.35m, null)
            });
    }

    private static ContractorRatingManualAssessmentDto CreateManualAssessment(Guid contractorId)
    {
        return new ContractorRatingManualAssessmentDto(
            Guid.NewGuid(),
            contractorId,
            Guid.NewGuid(),
            4.3m,
            "Manual",
            DateTimeOffset.UtcNow,
            "tester");
    }

    private static ContractorRatingRecalculationResultDto CreateRecalculationResult()
    {
        return new ContractorRatingRecalculationResultDto(
            4,
            3,
            Guid.NewGuid(),
            "v1");
    }

    private static ContractorRatingHistoryItemDto CreateHistoryItem(Guid contractorId)
    {
        return new ContractorRatingHistoryItemDto(
            Guid.NewGuid(),
            contractorId,
            Guid.NewGuid(),
            "v1",
            ContractorRatingRecordSourceType.AutoRecalculation,
            DateTimeOffset.UtcNow,
            4.1m,
            4.0m,
            4.2m,
            4.0m,
            0.2m,
            3.9m,
            null,
            "tester");
    }

    private static ContractorRatingAnalyticsRowDto CreateAnalyticsRow(Guid contractorId)
    {
        return new ContractorRatingAnalyticsRowDto(
            contractorId,
            "Branch Contractor",
            ContractorStatus.Active,
            ReliabilityClass.A,
            4.1m,
            25m,
            DateTimeOffset.UtcNow,
            "v1",
            0.2m);
    }

    private sealed class StubContractorsService : IContractorsService
    {
        public Func<string?, CancellationToken, Task<IReadOnlyList<ContractorListItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<ContractorListItemDto>>(new[] { CreateContractorListItem() });

        public Func<string?, int, int, CancellationToken, Task<ContractorListPageDto>> ListPageAsyncHandler { get; set; } =
            static (_, skip, take, _) => Task.FromResult(new ContractorListPageDto(new[] { CreateContractorListItem() }, 1, skip, take));

        public Func<Guid, CancellationToken, Task<ContractorDetailsDto?>> GetByIdAsyncHandler { get; set; } =
            static (id, _) => Task.FromResult<ContractorDetailsDto?>(CreateContractorDetails(id));

        public Func<CreateContractorRequest, CancellationToken, Task<ContractorDetailsDto>> CreateAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateContractorDetails());

        public Func<Guid, UpdateContractorRequest, CancellationToken, Task<ContractorDetailsDto?>> UpdateAsyncHandler { get; set; } =
            static (id, _, _) => Task.FromResult<ContractorDetailsDto?>(CreateContractorDetails(id));

        public Func<Guid, CancellationToken, Task<bool>> DeleteAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(true);

        public Func<CancellationToken, Task<int>> RecalculateCurrentLoadsAsyncHandler { get; set; } =
            static _ => Task.FromResult(3);

        public Task<IReadOnlyList<ContractorListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
            => ListAsyncHandler(search, cancellationToken);

        public Task<ContractorListPageDto> ListPageAsync(
            string? search,
            int skip,
            int take,
            CancellationToken cancellationToken = default)
            => ListPageAsyncHandler(search, skip, take, cancellationToken);

        public Task<ContractorDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => GetByIdAsyncHandler(id, cancellationToken);

        public Task<ContractorDetailsDto> CreateAsync(CreateContractorRequest request, CancellationToken cancellationToken = default)
            => CreateAsyncHandler(request, cancellationToken);

        public Task<ContractorDetailsDto?> UpdateAsync(Guid id, UpdateContractorRequest request, CancellationToken cancellationToken = default)
            => UpdateAsyncHandler(id, request, cancellationToken);

        public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
            => DeleteAsyncHandler(id, cancellationToken);

        public Task<int> RecalculateCurrentLoadsAsync(CancellationToken cancellationToken = default)
            => RecalculateCurrentLoadsAsyncHandler(cancellationToken);
    }

    private sealed class StubContractorRatingsService : IContractorRatingsService
    {
        public Func<CancellationToken, Task<ContractorRatingModelDto>> GetActiveModelAsyncHandler { get; set; } =
            static _ => Task.FromResult(CreateRatingModel());

        public Func<UpsertContractorRatingModelRequest, CancellationToken, Task<ContractorRatingModelDto>> UpsertActiveModelAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateRatingModel());

        public Func<Guid, UpsertContractorRatingManualAssessmentRequest, CancellationToken, Task<ContractorRatingManualAssessmentDto>> UpsertManualAssessmentAsyncHandler { get; set; } =
            static (contractorId, _, _) => Task.FromResult(CreateManualAssessment(contractorId));

        public Func<RecalculateContractorRatingsRequest, CancellationToken, Task<ContractorRatingRecalculationResultDto>> RecalculateRatingsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateRecalculationResult());

        public Func<Guid, int, CancellationToken, Task<IReadOnlyList<ContractorRatingHistoryItemDto>>> GetHistoryAsyncHandler { get; set; } =
            static (contractorId, _, _) => Task.FromResult<IReadOnlyList<ContractorRatingHistoryItemDto>>(new[] { CreateHistoryItem(contractorId) });

        public Func<CancellationToken, Task<IReadOnlyList<ContractorRatingAnalyticsRowDto>>> GetAnalyticsAsyncHandler { get; set; } =
            static _ =>
            {
                var contractorId = Guid.NewGuid();
                return Task.FromResult<IReadOnlyList<ContractorRatingAnalyticsRowDto>>(new[] { CreateAnalyticsRow(contractorId) });
            };

        public Task<ContractorRatingModelDto> GetActiveModelAsync(CancellationToken cancellationToken = default)
            => GetActiveModelAsyncHandler(cancellationToken);

        public Task<ContractorRatingModelDto> UpsertActiveModelAsync(
            UpsertContractorRatingModelRequest request,
            CancellationToken cancellationToken = default)
            => UpsertActiveModelAsyncHandler(request, cancellationToken);

        public Task<ContractorRatingManualAssessmentDto> UpsertManualAssessmentAsync(
            Guid contractorId,
            UpsertContractorRatingManualAssessmentRequest request,
            CancellationToken cancellationToken = default)
            => UpsertManualAssessmentAsyncHandler(contractorId, request, cancellationToken);

        public Task<ContractorRatingRecalculationResultDto> RecalculateRatingsAsync(
            RecalculateContractorRatingsRequest request,
            CancellationToken cancellationToken = default)
            => RecalculateRatingsAsyncHandler(request, cancellationToken);

        public Task<IReadOnlyList<ContractorRatingHistoryItemDto>> GetHistoryAsync(
            Guid contractorId,
            int top = 50,
            CancellationToken cancellationToken = default)
            => GetHistoryAsyncHandler(contractorId, top, cancellationToken);

        public Task<IReadOnlyList<ContractorRatingAnalyticsRowDto>> GetAnalyticsAsync(CancellationToken cancellationToken = default)
            => GetAnalyticsAsyncHandler(cancellationToken);
    }
}
