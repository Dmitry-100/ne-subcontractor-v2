using Subcontractor.Application.Lots;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotReadQueryServiceTests
{
    [Fact]
    public async Task GetByIdAsync_UnknownLot_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new LotReadQueryService(db);

        var result = await service.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task ListAsync_WithSearchStatusAndProjectFilters_ShouldReturnMatchingLot()
    {
        await using var db = TestDbContextFactory.Create();

        var projectA = Guid.NewGuid();
        var projectB = Guid.NewGuid();

        await db.Set<Lot>().AddRangeAsync(
            new Lot
            {
                Code = "LOT-001",
                Name = "Draft lot",
                Status = LotStatus.Draft,
                Items =
                [
                    new LotItem
                    {
                        ProjectId = projectA,
                        ObjectWbs = "A.01.01",
                        DisciplineCode = "PIPING",
                        ManHours = 10m
                    }
                ]
            },
            new Lot
            {
                Code = "LOT-002",
                Name = "In procurement lot",
                Status = LotStatus.InProcurement,
                Items =
                [
                    new LotItem
                    {
                        ProjectId = projectB,
                        ObjectWbs = "B.01.01",
                        DisciplineCode = "ELEC",
                        ManHours = 20m
                    }
                ]
            },
            new Lot
            {
                Code = "XYZ-003",
                Name = "Unrelated lot",
                Status = LotStatus.InProcurement,
                Items =
                [
                    new LotItem
                    {
                        ProjectId = projectA,
                        ObjectWbs = "C.01.01",
                        DisciplineCode = "CIVIL",
                        ManHours = 5m
                    }
                ]
            });
        await db.SaveChangesAsync();

        var service = new LotReadQueryService(db);
        var result = await service.ListAsync("LOT", LotStatus.InProcurement, projectB);

        var item = Assert.Single(result);
        Assert.Equal("LOT-002", item.Code);
        Assert.Equal(LotStatus.InProcurement, item.Status);
        Assert.Equal(1, item.ItemsCount);
        Assert.Equal(20m, item.TotalManHours);
    }

    [Fact]
    public async Task GetHistoryAsync_ShouldReturnNewestFirst()
    {
        await using var db = TestDbContextFactory.Create();

        var lot = new Lot
        {
            Code = "LOT-HISTORY-001",
            Name = "History lot",
            Status = LotStatus.Contracted
        };
        await db.Set<Lot>().AddAsync(lot);
        await db.SaveChangesAsync();

        await db.Set<LotStatusHistory>().AddRangeAsync(
            new LotStatusHistory
            {
                LotId = lot.Id,
                FromStatus = LotStatus.Draft,
                ToStatus = LotStatus.InProcurement,
                Reason = "Forward 1"
            });
        await db.SaveChangesAsync();

        await Task.Delay(10);
        await db.Set<LotStatusHistory>().AddAsync(new LotStatusHistory
        {
            LotId = lot.Id,
            FromStatus = LotStatus.InProcurement,
            ToStatus = LotStatus.Contracted,
            Reason = "Forward 2"
        });
        await db.SaveChangesAsync();

        var service = new LotReadQueryService(db);
        var history = await service.GetHistoryAsync(lot.Id);

        Assert.Equal(2, history.Count);
        Assert.Equal(LotStatus.Contracted, history[0].ToStatus);
        Assert.Equal(LotStatus.InProcurement, history[1].ToStatus);
    }

    [Fact]
    public async Task ListPageAsync_ShouldReturnPageAndTotalCount()
    {
        await using var db = TestDbContextFactory.Create();

        await db.Set<Lot>().AddRangeAsync(
            new Lot { Code = "LOT-P-001", Name = "Lot 1", Status = LotStatus.Draft },
            new Lot { Code = "LOT-P-002", Name = "Lot 2", Status = LotStatus.Draft },
            new Lot { Code = "LOT-P-003", Name = "Lot 3", Status = LotStatus.InProcurement },
            new Lot { Code = "LOT-P-004", Name = "Lot 4", Status = LotStatus.InProcurement });
        await db.SaveChangesAsync();

        var service = new LotReadQueryService(db);
        var page = await service.ListPageAsync(search: null, status: null, projectId: null, skip: 1, take: 2);

        Assert.Equal(4, page.TotalCount);
        Assert.Equal(1, page.Skip);
        Assert.Equal(2, page.Take);
        Assert.Collection(page.Items,
            x => Assert.Equal("LOT-P-002", x.Code),
            x => Assert.Equal("LOT-P-003", x.Code));
    }
}
