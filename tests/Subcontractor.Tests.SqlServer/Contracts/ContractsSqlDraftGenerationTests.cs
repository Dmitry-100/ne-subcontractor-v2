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
public sealed class ContractsSqlDraftGenerationTests
{
    [SqlFact]
    public async Task CreateDraftFromProcedureAsync_ShouldUseWinnerOffer_AndPersistHistory()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var setup = await SeedDraftSetupAsync(db, includeWinnerOffer: true);
        var service = new ContractsService(db);

        var created = await service.CreateDraftFromProcedureAsync(
            setup.ProcedureId,
            new CreateContractDraftFromProcedureRequest
            {
                ContractNumber = "   ",
                SigningDate = DateTime.UtcNow.Date,
                StartDate = DateTime.UtcNow.Date.AddDays(2),
                EndDate = DateTime.UtcNow.Date.AddDays(45)
            });

        Assert.Equal(ContractStatus.Draft, created.Status);
        Assert.Equal(setup.WinnerContractorId, created.ContractorId);
        Assert.Equal(500m, created.AmountWithoutVat);
        Assert.Equal(100m, created.VatAmount);
        Assert.Equal(600m, created.TotalAmount);

        var expectedPrefix = $"DRAFT-{DateTime.UtcNow:yyyyMMdd}-{setup.ProcedureId.ToString()[..8].ToUpperInvariant()}";
        Assert.StartsWith(expectedPrefix, created.ContractNumber, StringComparison.Ordinal);

        var persistedContract = await db.Set<Contract>()
            .AsNoTracking()
            .SingleAsync(x => x.ProcedureId == setup.ProcedureId);
        Assert.Equal(created.Id, persistedContract.Id);
        Assert.Equal(500m, persistedContract.AmountWithoutVat);
        Assert.Equal(100m, persistedContract.VatAmount);
        Assert.Equal(600m, persistedContract.TotalAmount);

        var historyRows = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ContractId == created.Id)
            .ToListAsync();

        var history = Assert.Single(historyRows);
        Assert.Null(history.FromStatus);
        Assert.Equal(ContractStatus.Draft, history.ToStatus);
        Assert.Equal("Draft generated from procedure outcome", history.Reason);
    }

    [SqlFact]
    public async Task CreateDraftFromProcedureAsync_WhenWinnerOfferMissing_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var setup = await SeedDraftSetupAsync(db, includeWinnerOffer: false);
        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateDraftFromProcedureAsync(
            setup.ProcedureId,
            new CreateContractDraftFromProcedureRequest
            {
                ContractNumber = "CTR-SQL-DR-MISSING",
                StartDate = DateTime.UtcNow.Date,
                EndDate = DateTime.UtcNow.Date.AddDays(30)
            }));

        Assert.Equal("Winner contractor offer was not found.", error.Message);

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
    public async Task CreateDraftFromProcedureAsync_WithDuplicateContractNumber_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var sourceSetup = await SeedDraftSetupAsync(db, includeWinnerOffer: true);
        var targetSetup = await SeedDraftSetupAsync(db, includeWinnerOffer: true);

        await db.Set<Contract>().AddAsync(new Contract
        {
            LotId = sourceSetup.LotId,
            ProcedureId = sourceSetup.ProcedureId,
            ContractorId = sourceSetup.WinnerContractorId,
            ContractNumber = "CTR-SQL-DR-DUP-01",
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            Status = ContractStatus.Draft
        });
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateDraftFromProcedureAsync(
            targetSetup.ProcedureId,
            new CreateContractDraftFromProcedureRequest
            {
                ContractNumber = "CTR-SQL-DR-DUP-01"
            }));

        Assert.Equal("Contract number 'CTR-SQL-DR-DUP-01' is already used.", error.Message);

        var targetContracts = await db.Set<Contract>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == targetSetup.ProcedureId)
            .ToListAsync();
        var targetHistory = await db.Set<ContractStatusHistory>()
            .AsNoTracking()
            .Where(x => x.Contract.ProcedureId == targetSetup.ProcedureId)
            .ToListAsync();

        Assert.Empty(targetContracts);
        Assert.Empty(targetHistory);
    }

    private static async Task<DraftSetup> SeedDraftSetupAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        bool includeWinnerOffer)
    {
        var lot = new Lot
        {
            Code = $"LOT-SQL-DR-{Guid.NewGuid():N}"[..20],
            Name = "SQL draft lot",
            Status = LotStatus.ContractorSelected
        };

        var winnerToken = Guid.NewGuid().ToString("N");
        var competitorToken = Guid.NewGuid().ToString("N");
        var winner = CreateContractor(winnerToken[..16], "SQL draft winner");
        var competitor = CreateContractor(competitorToken[..16], "SQL draft competitor");

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = ProcurementProcedureStatus.DecisionMade,
            ApprovalMode = ProcedureApprovalMode.InSystem,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "SQL draft procedure",
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
        await db.Set<Contractor>().AddRangeAsync(winner, competitor);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);
        await db.SaveChangesAsync();

        await db.Set<ProcedureOutcome>().AddAsync(new ProcedureOutcome
        {
            ProcedureId = procedure.Id,
            WinnerContractorId = winner.Id,
            DecisionDate = DateTime.UtcNow.Date,
            IsCanceled = false
        });

        if (includeWinnerOffer)
        {
            await db.Set<ProcedureOffer>().AddAsync(new ProcedureOffer
            {
                ProcedureId = procedure.Id,
                ContractorId = winner.Id,
                OfferNumber = $"SQL-WINNER-{Guid.NewGuid():N}"[..20],
                ReceivedDate = DateTime.UtcNow.Date.AddDays(-1),
                AmountWithoutVat = 500m,
                VatAmount = 100m,
                TotalAmount = 600m,
                CurrencyCode = "RUB",
                DecisionStatus = ProcedureOfferDecisionStatus.Winner
            });
        }

        await db.Set<ProcedureOffer>().AddAsync(new ProcedureOffer
        {
            ProcedureId = procedure.Id,
            ContractorId = competitor.Id,
            OfferNumber = $"SQL-OTHER-{Guid.NewGuid():N}"[..20],
            ReceivedDate = DateTime.UtcNow.Date,
            AmountWithoutVat = 900m,
            VatAmount = 180m,
            TotalAmount = 1080m,
            CurrencyCode = "RUB",
            DecisionStatus = ProcedureOfferDecisionStatus.Pending
        });

        await db.SaveChangesAsync();
        return new DraftSetup(lot.Id, procedure.Id, winner.Id);
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
            Email = $"{inn}@sql.local",
            CapacityHours = 160m,
            CurrentRating = 4.0m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
    }

    private sealed record DraftSetup(Guid LotId, Guid ProcedureId, Guid WinnerContractorId);
}
