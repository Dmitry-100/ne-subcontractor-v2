using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Application.Contractors;
using Subcontractor.Domain.Contractors;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorsControllerRatingTests
{
    [Fact]
    public async Task GetActiveRatingModel_ShouldReturnOkWithWeights()
    {
        await using var db = TestDbContextFactory.Create("rating-user");
        var controller = CreateController(db);

        var result = await controller.GetActiveRatingModel(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ContractorRatingModelDto>(ok.Value);
        Assert.True(payload.IsActive);
        Assert.NotEmpty(payload.Weights);
    }

    [Fact]
    public async Task RecalculateRatings_UnknownContractor_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create("rating-user");
        var controller = CreateController(db);

        var result = await controller.RecalculateRatings(
            new RecalculateContractorRatingsRequest
            {
                ContractorId = Guid.NewGuid(),
                IncludeInactiveContractors = true
            },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpsertManualAssessment_UnknownContractor_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create("rating-user");
        var controller = CreateController(db);

        var result = await controller.UpsertManualAssessment(
            Guid.NewGuid(),
            new UpsertContractorRatingManualAssessmentRequest
            {
                Score = 4.2m
            },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetRatingAnalytics_ShouldReturnOk()
    {
        await using var db = TestDbContextFactory.Create("rating-user");
        await SeedContractorAsync(db);
        var controller = CreateController(db);

        await controller.RecalculateRatings(
            new RecalculateContractorRatingsRequest
            {
                IncludeInactiveContractors = false
            },
            CancellationToken.None);

        var result = await controller.GetRatingAnalytics(CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<ContractorRatingAnalyticsRowDto>>(ok.Value);
        Assert.Single(payload);
    }

    private static async Task SeedContractorAsync(Infrastructure.Persistence.AppDbContext db)
    {
        var contractor = new Contractor
        {
            Inn = "7709988776",
            Name = "Controller rating contractor",
            City = "Moscow",
            ContactName = "Controller",
            Phone = "+70000000000",
            Email = "controller.rating@test.local",
            CapacityHours = 120m,
            CurrentRating = 3.0m,
            CurrentLoadPercent = 55m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };

        await db.Set<Contractor>().AddAsync(contractor);
        await db.SaveChangesAsync();
    }

    private static ContractorsController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var contractorsService = new ContractorsService(db);
        var ratingsService = new ContractorRatingsService(
            db,
            new FixedDateTimeProvider(new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero)));

        return new ContractorsController(contractorsService, ratingsService);
    }

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        public FixedDateTimeProvider(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }
}
