using Subcontractor.Application.Contractors;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorLoadCalculationTests
{
    [Fact]
    public async Task RecalculateCurrentLoadsAsync_ShouldUpdateActiveContractorLoadPercent()
    {
        await using var db = TestDbContextFactory.Create();

        var contractorA = new Contractor
        {
            Inn = "7700000001",
            Name = "Alpha",
            City = "Moscow",
            ContactName = "A",
            Phone = "+70000000001",
            Email = "alpha@example.local",
            CapacityHours = 100m,
            Status = ContractorStatus.Active
        };
        var contractorB = new Contractor
        {
            Inn = "7700000002",
            Name = "Beta",
            City = "Moscow",
            ContactName = "B",
            Phone = "+70000000002",
            Email = "beta@example.local",
            CapacityHours = 200m,
            Status = ContractorStatus.Active
        };

        var lotA = new Lot
        {
            Code = "LOT-LD-001",
            Name = "Lot load 1",
            Status = LotStatus.Contracted,
            Items =
            [
                new LotItem { ObjectWbs = "A.01", DisciplineCode = "PIPING", ManHours = 40m },
                new LotItem { ObjectWbs = "A.02", DisciplineCode = "ELEC", ManHours = 30m }
            ]
        };
        var lotB = new Lot
        {
            Code = "LOT-LD-002",
            Name = "Lot load 2",
            Status = LotStatus.Contracted,
            Items =
            [
                new LotItem { ObjectWbs = "B.01", DisciplineCode = "PIPING", ManHours = 120m }
            ]
        };

        await db.Set<Contractor>().AddRangeAsync(contractorA, contractorB);
        await db.Set<Lot>().AddRangeAsync(lotA, lotB);

        await db.Set<Contract>().AddRangeAsync(
            new Contract
            {
                LotId = lotA.Id,
                ProcedureId = Guid.NewGuid(),
                ContractorId = contractorA.Id,
                ContractNumber = "CTR-LD-001",
                Status = ContractStatus.Signed
            },
            new Contract
            {
                LotId = lotB.Id,
                ProcedureId = Guid.NewGuid(),
                ContractorId = contractorA.Id,
                ContractNumber = "CTR-LD-002",
                Status = ContractStatus.Active
            },
            new Contract
            {
                LotId = lotB.Id,
                ProcedureId = Guid.NewGuid(),
                ContractorId = contractorB.Id,
                ContractNumber = "CTR-LD-003",
                Status = ContractStatus.Active
            },
            new Contract
            {
                LotId = lotA.Id,
                ProcedureId = Guid.NewGuid(),
                ContractorId = contractorB.Id,
                ContractNumber = "CTR-LD-004",
                Status = ContractStatus.Draft
            });

        await db.SaveChangesAsync();

        var service = new ContractorsService(db);
        var updated = await service.RecalculateCurrentLoadsAsync();

        Assert.Equal(2, updated);

        var contractorAUpdated = await db.Set<Contractor>().FindAsync(contractorA.Id);
        var contractorBUpdated = await db.Set<Contractor>().FindAsync(contractorB.Id);

        Assert.NotNull(contractorAUpdated);
        Assert.NotNull(contractorBUpdated);
        Assert.Equal(190m, contractorAUpdated!.CurrentLoadPercent);
        Assert.Equal(60m, contractorBUpdated!.CurrentLoadPercent);
    }
}
