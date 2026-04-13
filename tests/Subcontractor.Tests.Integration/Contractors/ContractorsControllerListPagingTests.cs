using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorsControllerListPagingTests
{
    [Fact]
    public async Task List_WithPagingParameters_ShouldReturnPageEnvelope()
    {
        await using var db = TestDbContextFactory.Create("contractors-controller-page");
        await SeedContractorsAsync(db);

        var controller = CreateController(db);
        var result = await controller.List(
            search: null,
            skip: 1,
            take: 2,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<ContractorListPageDto>(ok.Value);

        Assert.Equal(4, payload.TotalCount);
        Assert.Equal(1, payload.Skip);
        Assert.Equal(2, payload.Take);
        Assert.Collection(payload.Items,
            x => Assert.Equal("7702000002", x.Inn),
            x => Assert.Equal("7702000003", x.Inn));
    }

    [Fact]
    public async Task List_WithoutPaging_ShouldReturnLegacyArrayContract()
    {
        await using var db = TestDbContextFactory.Create("contractors-controller-legacy");
        await SeedContractorsAsync(db);

        var controller = CreateController(db);
        var result = await controller.List(
            search: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<ContractorListItemDto>>(ok.Value);

        Assert.Equal(4, payload.Count);
        Assert.Equal("7702000001", payload[0].Inn);
        Assert.Equal("7702000004", payload[3].Inn);
    }

    private static ContractorsController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var contractorsService = new ContractorsService(db);
        var ratingsService = new ContractorRatingsService(
            db,
            new FixedDateTimeProvider(new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero)));

        return new ContractorsController(contractorsService, ratingsService);
    }

    private static async Task SeedContractorsAsync(Infrastructure.Persistence.AppDbContext db)
    {
        await db.Set<Contractor>().AddRangeAsync(
            CreateContractor("7702000001", "Contractor 1"),
            CreateContractor("7702000002", "Contractor 2"),
            CreateContractor("7702000003", "Contractor 3"),
            CreateContractor("7702000004", "Contractor 4"));
        await db.SaveChangesAsync();
    }

    private static Contractor CreateContractor(string inn, string name)
    {
        return new Contractor
        {
            Inn = inn,
            Name = name,
            City = "Moscow",
            ContactName = "Contact",
            Phone = "+70000000000",
            Email = $"{inn}@test.local",
            CapacityHours = 120m,
            Status = ContractorStatus.Active
        };
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
