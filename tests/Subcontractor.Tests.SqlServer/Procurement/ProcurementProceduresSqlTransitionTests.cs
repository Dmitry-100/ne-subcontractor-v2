using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Procurement;

[Trait("SqlSuite", "Core")]
public sealed class ProcurementProceduresSqlTransitionTests
{
    [SqlFact]
    public async Task TransitionToCompleted_WithoutContract_ShouldThrow()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var (lotId, procedureId) = await SeedDecisionMadeProcedureAsync(db);

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));
        var request = new ProcedureStatusTransitionRequest
        {
            TargetStatus = ProcurementProcedureStatus.Completed
        };

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionAsync(procedureId, request));
        Assert.Equal("Procedure can be completed only after contract draft is created.", error.Message);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        var lot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == lotId);
        var completedTransitionsCount = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .CountAsync(x => x.ProcedureId == procedureId && x.ToStatus == ProcurementProcedureStatus.Completed);
        var contractedLotTransitionsCount = await db.Set<LotStatusHistory>()
            .AsNoTracking()
            .CountAsync(x => x.LotId == lotId && x.ToStatus == LotStatus.Contracted);

        Assert.Equal(ProcurementProcedureStatus.DecisionMade, procedure.Status);
        Assert.Equal(LotStatus.ContractorSelected, lot.Status);
        Assert.Equal(0, completedTransitionsCount);
        Assert.Equal(0, contractedLotTransitionsCount);
    }

    [SqlFact]
    public async Task TransitionToCompleted_WithContractBoundToDifferentLot_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var (procedureLotId, procedureId) = await SeedDecisionMadeProcedureAsync(db);

        var foreignLot = new Lot
        {
            Code = "LOT-002",
            Name = "Foreign lot",
            Status = LotStatus.InProcurement
        };

        await db.Set<Lot>().AddAsync(foreignLot);
        await db.Set<Contract>().AddAsync(CreateContract(foreignLot.Id, procedureId, "CTR-002"));
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));
        var request = new ProcedureStatusTransitionRequest
        {
            TargetStatus = ProcurementProcedureStatus.Completed
        };

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionAsync(procedureId, request));
        Assert.Equal("Bound contract lot does not match procedure lot.", error.Message);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        var procedureLot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == procedureLotId);
        var untouchedForeignLot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == foreignLot.Id);
        var completedTransitionsCount = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .CountAsync(x => x.ProcedureId == procedureId && x.ToStatus == ProcurementProcedureStatus.Completed);
        var procedureLotContractedTransitionsCount = await db.Set<LotStatusHistory>()
            .AsNoTracking()
            .CountAsync(x => x.LotId == procedureLotId && x.ToStatus == LotStatus.Contracted);

        Assert.Equal(ProcurementProcedureStatus.DecisionMade, procedure.Status);
        Assert.Equal(LotStatus.ContractorSelected, procedureLot.Status);
        Assert.Equal(LotStatus.InProcurement, untouchedForeignLot.Status);
        Assert.Equal(0, completedTransitionsCount);
        Assert.Equal(0, procedureLotContractedTransitionsCount);
    }

    [SqlFact]
    public async Task TransitionToCompleted_WithSingleContract_ShouldCompleteProcedureAndContractLot()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var (lotId, procedureId) = await SeedDecisionMadeProcedureAsync(db);

        await db.Set<Contract>().AddAsync(CreateContract(lotId, procedureId, "CTR-001"));
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));
        var history = await service.TransitionAsync(procedureId, new ProcedureStatusTransitionRequest
        {
            TargetStatus = ProcurementProcedureStatus.Completed
        });

        Assert.NotNull(history);
        Assert.Equal(ProcurementProcedureStatus.Completed, history!.ToStatus);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        var lot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == lotId);
        var lotHistory = await db.Set<LotStatusHistory>()
            .AsNoTracking()
            .SingleAsync(x => x.LotId == lotId && x.ToStatus == LotStatus.Contracted);
        var procedureHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .SingleAsync(x => x.ProcedureId == procedureId && x.ToStatus == ProcurementProcedureStatus.Completed);

        Assert.Equal(ProcurementProcedureStatus.Completed, procedure.Status);
        Assert.Equal(LotStatus.Contracted, lot.Status);
        Assert.Equal("Procedure completed and contract draft is bound", lotHistory.Reason);
        Assert.Equal(ProcurementProcedureStatus.DecisionMade, procedureHistory.FromStatus);
    }

    private static async Task<(Guid LotId, Guid ProcedureId)> SeedDecisionMadeProcedureAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db)
    {
        var lot = new Lot
        {
            Code = "LOT-001",
            Name = "SQL integration test lot",
            Status = LotStatus.ContractorSelected
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = ProcurementProcedureStatus.DecisionMade,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Object",
            WorkScope = "Scope",
            CustomerName = "Customer",
            LeadOfficeCode = "LEAD",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5"
        };

        await db.Set<Lot>().AddAsync(lot);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);

        await db.SaveChangesAsync();
        return (lot.Id, procedure.Id);
    }

    private static Contract CreateContract(Guid lotId, Guid procedureId, string contractNumber)
    {
        return new Contract
        {
            LotId = lotId,
            ProcedureId = procedureId,
            ContractorId = Guid.NewGuid(),
            ContractNumber = contractNumber,
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m
        };
    }
}
