using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contracts;

public sealed class ContractWorkflowTests
{
    [Fact]
    public async Task TransitionAsync_ForwardStep_ShouldUpdateStatusAndPersistHistory()
    {
        await using var db = TestDbContextFactory.Create();
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

    [Fact]
    public async Task TransitionAsync_SkipStep_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
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
    }

    [Fact]
    public async Task TransitionAsync_ToSignedWithoutSigningDate_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
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
    }

    [Fact]
    public async Task UpdateAsync_WithStatusChange_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(status: ContractStatus.Draft, signingDate: null);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(
            contract.Id,
            new UpdateContractRequest
            {
                ContractNumber = contract.ContractNumber,
                SigningDate = contract.SigningDate,
                AmountWithoutVat = contract.AmountWithoutVat,
                VatAmount = contract.VatAmount,
                TotalAmount = contract.TotalAmount,
                StartDate = contract.StartDate,
                EndDate = contract.EndDate,
                Status = ContractStatus.OnApproval
            }));

        Assert.Equal("Status cannot be changed via update API. Use transition endpoint.", error.Message);
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
