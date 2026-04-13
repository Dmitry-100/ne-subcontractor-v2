using Subcontractor.Application.Contracts;
using Subcontractor.Domain.Contracts;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contracts;

public sealed class ContractReadQueryServiceTests
{
    [Fact]
    public async Task ListPageAsync_ShouldReturnPageAndTotalCount()
    {
        await using var db = TestDbContextFactory.Create("contracts-read-page");
        var contracts = new[]
        {
            CreateContract("CTR-P-001"),
            CreateContract("CTR-P-002"),
            CreateContract("CTR-P-003"),
            CreateContract("CTR-P-004")
        };
        await db.Set<Contract>().AddRangeAsync(contracts);
        await db.SaveChangesAsync();

        var now = DateTimeOffset.UtcNow;
        contracts[0].CreatedAtUtc = now.AddMinutes(-4);
        contracts[1].CreatedAtUtc = now.AddMinutes(-3);
        contracts[2].CreatedAtUtc = now.AddMinutes(-2);
        contracts[3].CreatedAtUtc = now.AddMinutes(-1);
        await db.SaveChangesAsync();

        var service = new ContractReadQueryService(db);
        var allItems = await service.ListAsync(
            search: null,
            status: null,
            lotId: null,
            procedureId: null,
            contractorId: null,
            cancellationToken: CancellationToken.None);
        var page = await service.ListPageAsync(
            search: null,
            status: null,
            lotId: null,
            procedureId: null,
            contractorId: null,
            skip: 1,
            take: 2,
            cancellationToken: CancellationToken.None);

        Assert.Equal(4, page.TotalCount);
        Assert.Equal(1, page.Skip);
        Assert.Equal(2, page.Take);

        var expectedContractNumbers = allItems
            .Skip(1)
            .Take(2)
            .Select(x => x.ContractNumber)
            .ToArray();
        var pageContractNumbers = page.Items.Select(x => x.ContractNumber).ToArray();
        Assert.Equal(expectedContractNumbers, pageContractNumbers);
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
