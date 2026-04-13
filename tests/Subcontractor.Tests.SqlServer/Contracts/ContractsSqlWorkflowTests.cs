using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Contracts;

[Trait("SqlSuite", "Core")]
public sealed class ContractsSqlWorkflowTests
{
    [SqlFact]
    public async Task TransitionAsync_ForwardStep_ShouldUpdateStatusAndPersistHistory()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(status: ContractStatus.Draft, signingDate: null);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var history = await service.TransitionAsync(contract.Id, new ContractStatusTransitionRequest
        {
            TargetStatus = ContractStatus.OnApproval
        });

        Assert.NotNull(history);
        Assert.Equal(ContractStatus.Draft, history!.FromStatus);
        Assert.Equal(ContractStatus.OnApproval, history.ToStatus);

        var reloaded = await db.Set<Contract>().AsNoTracking().SingleAsync(x => x.Id == contract.Id);
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();

        Assert.Equal(ContractStatus.OnApproval, reloaded.Status);
        Assert.Single(historyRows);
    }

    [SqlFact]
    public async Task TransitionAsync_SkipStep_ShouldThrowInvalidOperationException()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(status: ContractStatus.Draft, signingDate: DateTime.UtcNow.Date);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionAsync(
            contract.Id,
            new ContractStatusTransitionRequest
            {
                TargetStatus = ContractStatus.Signed
            }));

        Assert.Equal("Transition Draft -> Signed is not allowed.", error.Message);

        var reloaded = await db.Set<Contract>().AsNoTracking().SingleAsync(x => x.Id == contract.Id);
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();
        Assert.Equal(ContractStatus.Draft, reloaded.Status);
        Assert.Empty(historyRows);
    }

    [SqlFact]
    public async Task TransitionAsync_RollbackWithoutReason_ShouldThrowArgumentException_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(status: ContractStatus.OnApproval, signingDate: DateTime.UtcNow.Date);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.TransitionAsync(
            contract.Id,
            new ContractStatusTransitionRequest
            {
                TargetStatus = ContractStatus.Draft,
                Reason = "   "
            }));

        Assert.Equal("Rollback reason is required. (Parameter 'reason')", error.Message);
        Assert.Equal("reason", error.ParamName);

        var reloaded = await db.Set<Contract>().AsNoTracking().SingleAsync(x => x.Id == contract.Id);
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();

        Assert.Equal(ContractStatus.OnApproval, reloaded.Status);
        Assert.Empty(historyRows);
    }

    [SqlFact]
    public async Task TransitionAsync_ToSignedWithoutSigningDate_ShouldThrowInvalidOperationException_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(status: ContractStatus.OnApproval, signingDate: null);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionAsync(
            contract.Id,
            new ContractStatusTransitionRequest
            {
                TargetStatus = ContractStatus.Signed
            }));

        Assert.Equal("SigningDate is required before transition to Signed.", error.Message);

        var reloaded = await db.Set<Contract>().AsNoTracking().SingleAsync(x => x.Id == contract.Id);
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();

        Assert.Equal(ContractStatus.OnApproval, reloaded.Status);
        Assert.Empty(historyRows);
    }

    [SqlFact]
    public async Task TransitionAsync_ToClosedWithOverdueMilestones_ShouldThrowInvalidOperationException_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(status: ContractStatus.Active, signingDate: DateTime.UtcNow.Date.AddDays(-10));
        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMilestone>().AddAsync(new ContractMilestone
        {
            ContractId = contract.Id,
            Title = "Просроченный этап",
            PlannedDate = DateTime.UtcNow.Date.AddDays(-2),
            ProgressPercent = 75m,
            SortOrder = 0
        });
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionAsync(
            contract.Id,
            new ContractStatusTransitionRequest
            {
                TargetStatus = ContractStatus.Closed
            }));

        Assert.Equal("Contract has overdue milestones. Resolve overdue items before closing.", error.Message);

        var reloaded = await db.Set<Contract>().AsNoTracking().SingleAsync(x => x.Id == contract.Id);
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();

        Assert.Equal(ContractStatus.Active, reloaded.Status);
        Assert.Empty(historyRows);
    }

    private static Contract CreateContract(ContractStatus status, DateTime? signingDate)
    {
        return new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = $"CTR-{Guid.NewGuid():N}".Substring(0, 18),
            SigningDate = signingDate,
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(30),
            Status = status
        };
    }
}
