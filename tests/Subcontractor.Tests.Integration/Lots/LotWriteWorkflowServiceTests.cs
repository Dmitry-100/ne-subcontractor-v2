using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotWriteWorkflowServiceTests
{
    [Fact]
    public async Task CreateAsync_WithNormalizedValues_ShouldPersistDraftLotAndHistory()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new LotWriteWorkflowService(db);

        var result = await service.CreateAsync(new CreateLotRequest
        {
            Code = "  LOT-NEW-001  ",
            Name = "  New lot  ",
            Items =
            [
                new UpsertLotItemRequest
                {
                    ProjectId = Guid.NewGuid(),
                    ObjectWbs = "  A.01.01  ",
                    DisciplineCode = " piping ",
                    ManHours = 12.5m
                }
            ]
        });

        Assert.Equal("LOT-NEW-001", result.Code);
        Assert.Equal("New lot", result.Name);
        var item = Assert.Single(result.Items);
        Assert.Equal("A.01.01", item.ObjectWbs);
        Assert.Equal("PIPING", item.DisciplineCode);

        var lot = await db.Set<Lot>()
            .AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == result.Id);
        Assert.NotNull(lot);
        Assert.Equal(LotStatus.Draft, lot!.Status);
        Assert.Single(lot.Items);

        var history = await db.Set<LotStatusHistory>()
            .AsNoTracking()
            .Where(x => x.LotId == result.Id)
            .ToListAsync();
        var historyItem = Assert.Single(history);
        Assert.Null(historyItem.FromStatus);
        Assert.Equal(LotStatus.Draft, historyItem.ToStatus);
    }

    [Fact]
    public async Task UpdateAsync_ForLotWithoutItems_ShouldPersistChanges()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new LotWriteWorkflowService(db);

        var created = await service.CreateAsync(new CreateLotRequest
        {
            Code = "LOT-UPD-001",
            Name = "Original lot"
        });

        db.ChangeTracker.Clear();

        var updated = await service.UpdateAsync(created.Id, new UpdateLotRequest
        {
            Name = "Updated lot",
            Items =
            [
                new UpsertLotItemRequest
                {
                    ProjectId = Guid.NewGuid(),
                    ObjectWbs = "B.01.01",
                    DisciplineCode = "ELEC",
                    ManHours = 20m
                },
                new UpsertLotItemRequest
                {
                    ProjectId = Guid.NewGuid(),
                    ObjectWbs = "B.01.02",
                    DisciplineCode = "CIVIL",
                    ManHours = 5m
                }
            ]
        });

        Assert.NotNull(updated);
        Assert.Equal("Updated lot", updated!.Name);
        Assert.Equal(2, updated.Items.Count);

        var persisted = await db.Set<Lot>()
            .AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == created.Id);
        Assert.NotNull(persisted);
        Assert.Equal(2, persisted!.Items.Count);
    }

    [Fact]
    public async Task TransitionAsync_ForwardStep_ShouldPersistHistoryAndStatus()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new LotWriteWorkflowService(db);

        var created = await service.CreateAsync(new CreateLotRequest
        {
            Code = "LOT-TRANSITION-001",
            Name = "Transition lot"
        });

        var transitioned = await service.TransitionAsync(created.Id, new LotStatusTransitionRequest
        {
            TargetStatus = LotStatus.InProcurement
        });

        Assert.NotNull(transitioned);
        Assert.Equal(LotStatus.Draft, transitioned!.FromStatus);
        Assert.Equal(LotStatus.InProcurement, transitioned.ToStatus);

        var persisted = await db.Set<Lot>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == created.Id);
        Assert.NotNull(persisted);
        Assert.Equal(LotStatus.InProcurement, persisted!.Status);
    }

    [Fact]
    public async Task TransitionAsync_RollbackWithoutReason_ShouldThrowAndKeepStatus()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new LotWriteWorkflowService(db);

        var lot = new Lot
        {
            Code = "LOT-ROLLBACK-001",
            Name = "Rollback lot",
            Status = LotStatus.Contracted
        };
        await db.Set<Lot>().AddAsync(lot);
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.TransitionAsync(
            lot.Id,
            new LotStatusTransitionRequest
            {
                TargetStatus = LotStatus.InProcurement
            }));
        Assert.Equal("reason", error.ParamName);

        var persisted = await db.Set<Lot>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == lot.Id);
        Assert.NotNull(persisted);
        Assert.Equal(LotStatus.Contracted, persisted!.Status);

        var historyCount = await db.Set<LotStatusHistory>()
            .CountAsync(x => x.LotId == lot.Id);
        Assert.Equal(0, historyCount);
    }
}
