using Subcontractor.Application.Contractors;
using Subcontractor.Domain.Contractors;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorReadQueryServiceTests
{
    [Fact]
    public async Task GetByIdAsync_UnknownContractor_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ContractorReadQueryService(db);

        var result = await service.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task ListAsync_WithSearch_ShouldReturnMatchingContractor()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Contractor>().AddRangeAsync(
            new Contractor
            {
                Inn = "7700000001",
                Name = "Alpha Build",
                City = "Moscow",
                ContactName = "A",
                Phone = "+70000000001",
                Email = "alpha@test.local",
                CapacityHours = 100m,
                Status = ContractorStatus.Active
            },
            new Contractor
            {
                Inn = "7700000002",
                Name = "Beta Build",
                City = "Kazan",
                ContactName = "B",
                Phone = "+70000000002",
                Email = "beta@test.local",
                CapacityHours = 200m,
                Status = ContractorStatus.Active
            });
        await db.SaveChangesAsync();

        var service = new ContractorReadQueryService(db);
        var result = await service.ListAsync("Kazan");

        var item = Assert.Single(result);
        Assert.Equal("7700000002", item.Inn);
        Assert.Equal("Beta Build", item.Name);
    }

    [Fact]
    public async Task ListPageAsync_ShouldReturnPageAndTotalCount()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Contractor>().AddRangeAsync(
            CreateContractor("7701000001", "Contractor 1"),
            CreateContractor("7701000002", "Contractor 2"),
            CreateContractor("7701000003", "Contractor 3"),
            CreateContractor("7701000004", "Contractor 4"));
        await db.SaveChangesAsync();

        var service = new ContractorReadQueryService(db);
        var page = await service.ListPageAsync(search: null, skip: 1, take: 2);

        Assert.Equal(4, page.TotalCount);
        Assert.Equal(1, page.Skip);
        Assert.Equal(2, page.Take);
        Assert.Collection(page.Items,
            x => Assert.Equal("7701000002", x.Inn),
            x => Assert.Equal("7701000003", x.Inn));
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnSortedDisciplineCodes()
    {
        await using var db = TestDbContextFactory.Create();

        var contractor = new Contractor
        {
            Inn = "7700000099",
            Name = "Sorted contractor",
            City = "Moscow",
            ContactName = "C",
            Phone = "+70000000099",
            Email = "sorted@test.local",
            CapacityHours = 160m,
            Status = ContractorStatus.Active,
            Qualifications =
            [
                new ContractorQualification { DisciplineCode = "PIPING" },
                new ContractorQualification { DisciplineCode = "ARCH" },
                new ContractorQualification { DisciplineCode = "ELEC" }
            ]
        };

        await db.Set<Contractor>().AddAsync(contractor);
        await db.SaveChangesAsync();

        var service = new ContractorReadQueryService(db);
        var result = await service.GetByIdAsync(contractor.Id);

        Assert.NotNull(result);
        Assert.Equal(["ARCH", "ELEC", "PIPING"], result!.DisciplineCodes);
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
}
