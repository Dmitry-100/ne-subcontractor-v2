using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Contracts;

public sealed class ContractsControllerListPagingTests
{
    [Fact]
    public async Task List_WithPagingParameters_ShouldReturnPageEnvelope()
    {
        await using var db = TestDbContextFactory.Create("contracts-controller-page");
        await SeedContractsAsync(db);

        var controller = new ContractsController(new ContractsService(db));
        var legacyResult = await controller.List(
            search: null,
            status: null,
            lotId: null,
            procedureId: null,
            contractorId: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);
        var legacyOk = Assert.IsType<OkObjectResult>(legacyResult);
        var legacyPayload = Assert.IsAssignableFrom<IReadOnlyList<ContractListItemDto>>(legacyOk.Value);

        var result = await controller.List(
            search: null,
            status: null,
            lotId: null,
            procedureId: null,
            contractorId: null,
            skip: 1,
            take: 2,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<ContractListPageDto>(ok.Value);

        Assert.Equal(4, payload.TotalCount);
        Assert.Equal(1, payload.Skip);
        Assert.Equal(2, payload.Take);
        var expectedContractNumbers = legacyPayload
            .Skip(1)
            .Take(2)
            .Select(x => x.ContractNumber)
            .ToArray();
        var pageContractNumbers = payload.Items.Select(x => x.ContractNumber).ToArray();
        Assert.Equal(expectedContractNumbers, pageContractNumbers);
    }

    [Fact]
    public async Task List_WithoutPaging_ShouldReturnLegacyArrayContract()
    {
        await using var db = TestDbContextFactory.Create("contracts-controller-legacy");
        await SeedContractsAsync(db);

        var controller = new ContractsController(new ContractsService(db));
        var result = await controller.List(
            search: null,
            status: null,
            lotId: null,
            procedureId: null,
            contractorId: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<ContractListItemDto>>(ok.Value);

        Assert.Equal(4, payload.Count);
        var contractNumbers = payload.Select(x => x.ContractNumber).OrderBy(x => x).ToArray();
        Assert.True(contractNumbers.SequenceEqual(["CTR-C-001", "CTR-C-002", "CTR-C-003", "CTR-C-004"]));
    }

    private static async Task SeedContractsAsync(Infrastructure.Persistence.AppDbContext db)
    {
        var now = DateTimeOffset.UtcNow;
        var contracts = new[]
        {
            CreateContract("CTR-C-001"),
            CreateContract("CTR-C-002"),
            CreateContract("CTR-C-003"),
            CreateContract("CTR-C-004")
        };

        await db.Set<Contract>().AddRangeAsync(contracts);
        await db.SaveChangesAsync();

        contracts[0].CreatedAtUtc = now.AddMinutes(-4);
        contracts[1].CreatedAtUtc = now.AddMinutes(-3);
        contracts[2].CreatedAtUtc = now.AddMinutes(-2);
        contracts[3].CreatedAtUtc = now.AddMinutes(-1);
        await db.SaveChangesAsync();
    }

    private static Contract CreateContract(string contractNumber)
    {
        return new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = contractNumber,
            SigningDate = DateTime.UtcNow.Date,
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(30),
            Status = ContractStatus.Draft
        };
    }
}
