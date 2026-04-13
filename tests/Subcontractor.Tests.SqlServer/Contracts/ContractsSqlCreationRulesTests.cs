using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Contracts;

[Trait("SqlSuite", "Core")]
public sealed class ContractsSqlCreationRulesTests
{
    [SqlFact]
    public async Task CreateAsync_WithProcedureStatusSent_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var setup = await SeedContractCreationSetupAsync(
            db,
            procedureStatus: ProcurementProcedureStatus.Sent);
        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(
            BuildCreateRequest(setup.LotId, setup.ProcedureId, setup.WinnerContractorId, "CTR-SQL-CR-01")));

        Assert.Equal("Contract can be created only for procedures in DecisionMade/Completed statuses.", error.Message);

        var contracts = await db.Set<Contract>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .ToListAsync();
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.Contract.ProcedureId == setup.ProcedureId)
            .ToListAsync();

        Assert.Empty(contracts);
        Assert.Empty(historyRows);
    }

    [SqlFact]
    public async Task CreateAsync_WithOutcomeWinnerMismatch_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var setup = await SeedContractCreationSetupAsync(
            db,
            procedureStatus: ProcurementProcedureStatus.DecisionMade);

        await db.Set<ProcedureOutcome>().AddAsync(new ProcedureOutcome
        {
            ProcedureId = setup.ProcedureId,
            WinnerContractorId = setup.WinnerContractorId,
            DecisionDate = DateTime.UtcNow.Date,
            IsCanceled = false
        });
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(
            BuildCreateRequest(setup.LotId, setup.ProcedureId, setup.AlternativeContractorId, "CTR-SQL-CR-02")));

        Assert.Equal("Contractor must match winner selected in procedure outcome.", error.Message);

        var contracts = await db.Set<Contract>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .ToListAsync();
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.Contract.ProcedureId == setup.ProcedureId)
            .ToListAsync();

        Assert.Empty(contracts);
        Assert.Empty(historyRows);
    }

    [SqlFact]
    public async Task CreateAsync_SecondContractForSameProcedure_ShouldThrow_AndKeepSingleContract()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var setup = await SeedContractCreationSetupAsync(
            db,
            procedureStatus: ProcurementProcedureStatus.DecisionMade);
        var service = new ContractsService(db);

        var first = await service.CreateAsync(
            BuildCreateRequest(setup.LotId, setup.ProcedureId, setup.WinnerContractorId, "CTR-SQL-CR-03"));
        Assert.Equal("CTR-SQL-CR-03", first.ContractNumber);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(
            BuildCreateRequest(setup.LotId, setup.ProcedureId, setup.WinnerContractorId, "CTR-SQL-CR-04")));
        Assert.Equal("Contract for this procedure already exists.", error.Message);

        var contracts = await db.Set<Contract>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .OrderBy(x => x.ContractNumber)
            .ToListAsync();
        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.Contract.ProcedureId == setup.ProcedureId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();

        Assert.Single(contracts);
        Assert.Equal("CTR-SQL-CR-03", contracts[0].ContractNumber);
        Assert.Single(historyRows);
        Assert.Equal(ContractStatus.Draft, historyRows[0].ToStatus);
    }

    private static async Task<ContractCreationSetup> SeedContractCreationSetupAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        ProcurementProcedureStatus procedureStatus)
    {
        var lot = new Lot
        {
            Code = $"LOT-SQL-CR-{Guid.NewGuid():N}"[..16],
            Name = "SQL contract-creation lot",
            Status = LotStatus.ContractorSelected
        };

        var winner = CreateContractor("7700000601", "SQL contract winner");
        var alternative = CreateContractor("7700000602", "SQL contract alternative");

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = procedureStatus,
            ApprovalMode = ProcedureApprovalMode.InSystem,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Contract creation SQL procedure",
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
        await db.Set<Contractor>().AddRangeAsync(winner, alternative);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);
        await db.SaveChangesAsync();

        return new ContractCreationSetup(
            LotId: lot.Id,
            ProcedureId: procedure.Id,
            WinnerContractorId: winner.Id,
            AlternativeContractorId: alternative.Id);
    }

    private static CreateContractRequest BuildCreateRequest(
        Guid lotId,
        Guid procedureId,
        Guid contractorId,
        string contractNumber)
    {
        return new CreateContractRequest
        {
            LotId = lotId,
            ProcedureId = procedureId,
            ContractorId = contractorId,
            ContractNumber = contractNumber,
            AmountWithoutVat = 1000m,
            VatAmount = 200m,
            TotalAmount = 1200m,
            Status = ContractStatus.Draft,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(30)
        };
    }

    private static Contractor CreateContractor(string inn, string name)
    {
        return new Contractor
        {
            Inn = inn,
            Name = name,
            City = "Moscow",
            ContactName = name,
            Phone = "+70000000000",
            Email = $"{inn}@example.local",
            CapacityHours = 160m,
            CurrentRating = 4.0m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
    }

    private sealed record ContractCreationSetup(
        Guid LotId,
        Guid ProcedureId,
        Guid WinnerContractorId,
        Guid AlternativeContractorId);
}
