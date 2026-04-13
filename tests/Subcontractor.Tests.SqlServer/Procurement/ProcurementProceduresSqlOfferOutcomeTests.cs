using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Procurement;

[Trait("SqlSuite", "Core")]
public sealed class ProcurementProceduresSqlOfferOutcomeTests
{
    [SqlFact]
    public async Task UpsertOffersAsync_WithSentProcedure_ShouldPersistOffersAndMoveStatusToOffersReceived()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.Sent);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var offers = await service.UpsertOffersAsync(setup.ProcedureId, new UpdateProcedureOffersRequest
        {
            Items =
            [
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.FirstContractorId,
                    OfferNumber = "OFR-SQL-1",
                    AmountWithoutVat = 100m,
                    VatAmount = 20m,
                    TotalAmount = 120m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Pending
                }
            ]
        });

        Assert.Single(offers);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == setup.ProcedureId);
        Assert.Equal(ProcurementProcedureStatus.OffersReceived, procedure.Status);
    }

    [SqlFact]
    public async Task UpsertOutcomeAsync_WithWinner_ShouldSetLotAndProcedureStatuses()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.OffersReceived);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        await service.UpsertOffersAsync(setup.ProcedureId, new UpdateProcedureOffersRequest
        {
            Items =
            [
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.FirstContractorId,
                    OfferNumber = "OFR-SQL-W1",
                    AmountWithoutVat = 120m,
                    VatAmount = 24m,
                    TotalAmount = 144m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Pending
                },
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.SecondContractorId,
                    OfferNumber = "OFR-SQL-W2",
                    AmountWithoutVat = 100m,
                    VatAmount = 20m,
                    TotalAmount = 120m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Pending
                }
            ]
        });

        var outcome = await service.UpsertOutcomeAsync(setup.ProcedureId, new UpdateProcedureOutcomeRequest
        {
            WinnerContractorId = setup.SecondContractorId,
            DecisionDate = DateTime.UtcNow.Date,
            IsCanceled = false,
            Comment = "SQL winner"
        });

        Assert.Equal(setup.SecondContractorId, outcome.WinnerContractorId);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == setup.ProcedureId);
        var lot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == setup.LotId);

        Assert.Equal(ProcurementProcedureStatus.DecisionMade, procedure.Status);
        Assert.Equal(LotStatus.ContractorSelected, lot.Status);
    }

    [SqlFact]
    public async Task UpsertOutcomeAsync_WhenCanceled_ShouldMoveProcedureToRetender_ResetWinnerAndLotStatus()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.OffersReceived);

        var lot = await db.Set<Lot>().SingleAsync(x => x.Id == setup.LotId);
        lot.Status = LotStatus.ContractorSelected;
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        await service.UpsertOffersAsync(setup.ProcedureId, new UpdateProcedureOffersRequest
        {
            Items =
            [
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.FirstContractorId,
                    OfferNumber = "OFR-SQL-C1",
                    AmountWithoutVat = 120m,
                    VatAmount = 24m,
                    TotalAmount = 144m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Winner
                },
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.SecondContractorId,
                    OfferNumber = "OFR-SQL-C2",
                    AmountWithoutVat = 110m,
                    VatAmount = 22m,
                    TotalAmount = 132m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Pending
                }
            ]
        });

        var outcome = await service.UpsertOutcomeAsync(setup.ProcedureId, new UpdateProcedureOutcomeRequest
        {
            WinnerContractorId = setup.FirstContractorId,
            DecisionDate = DateTime.UtcNow.Date,
            IsCanceled = true,
            CancellationReason = "  Повторный тендер по бюджету  ",
            Comment = "  Сброс решения  "
        });

        Assert.True(outcome.IsCanceled);
        Assert.Null(outcome.WinnerContractorId);
        Assert.Equal("Повторный тендер по бюджету", outcome.CancellationReason);
        Assert.Equal("Сброс решения", outcome.Comment);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == setup.ProcedureId);
        var reloadedLot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == setup.LotId);
        var offers = await db.Set<ProcedureOffer>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .ToListAsync();
        var procedureHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .SingleAsync(x => x.ProcedureId == setup.ProcedureId && x.ToStatus == ProcurementProcedureStatus.Retender);
        var lotHistory = await db.Set<LotStatusHistory>()
            .AsNoTracking()
            .SingleAsync(x => x.LotId == setup.LotId && x.ToStatus == LotStatus.InProcurement);

        Assert.Equal(ProcurementProcedureStatus.Retender, procedure.Status);
        Assert.Equal(LotStatus.InProcurement, reloadedLot.Status);
        Assert.All(offers, x => Assert.NotEqual(ProcedureOfferDecisionStatus.Winner, x.DecisionStatus));
        Assert.Equal("Повторный тендер по бюджету", procedureHistory.Reason);
        Assert.Equal(LotStatus.ContractorSelected, lotHistory.FromStatus);
        Assert.Equal("Procedure returned to retender stage", lotHistory.Reason);
    }

    [SqlFact]
    public async Task UpsertOutcomeAsync_WhenWinnerHasNoOffer_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.OffersReceived);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        await service.UpsertOffersAsync(setup.ProcedureId, new UpdateProcedureOffersRequest
        {
            Items =
            [
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.FirstContractorId,
                    OfferNumber = "OFR-SQL-E1",
                    AmountWithoutVat = 100m,
                    VatAmount = 20m,
                    TotalAmount = 120m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Pending
                }
            ]
        });

        var outsiderContractor = CreateContractor("7700000399", "SQL outsider contractor");
        await db.Set<Contractor>().AddAsync(outsiderContractor);
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertOutcomeAsync(
            setup.ProcedureId,
            new UpdateProcedureOutcomeRequest
            {
                WinnerContractorId = outsiderContractor.Id,
                DecisionDate = DateTime.UtcNow.Date,
                IsCanceled = false,
                Comment = "Invalid winner"
            }));

        Assert.Equal("WinnerContractorId", error.ParamName);
        Assert.Contains("Winner contractor must have an offer in this procedure.", error.Message, StringComparison.Ordinal);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == setup.ProcedureId);
        var lot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == setup.LotId);
        var outcome = await db.Set<ProcedureOutcome>()
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.ProcedureId == setup.ProcedureId);
        var offers = await db.Set<ProcedureOffer>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .ToListAsync();
        var procedureHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .Where(x =>
                x.ProcedureId == setup.ProcedureId &&
                (x.ToStatus == ProcurementProcedureStatus.DecisionMade || x.ToStatus == ProcurementProcedureStatus.Retender))
            .ToListAsync();
        var lotHistory = await db.Set<LotStatusHistory>()
            .AsNoTracking()
            .Where(x => x.LotId == setup.LotId)
            .ToListAsync();

        Assert.Equal(ProcurementProcedureStatus.OffersReceived, procedure.Status);
        Assert.Equal(LotStatus.InProcurement, lot.Status);
        Assert.Null(outcome);
        Assert.All(offers, x => Assert.NotEqual(ProcedureOfferDecisionStatus.Winner, x.DecisionStatus));
        Assert.Empty(procedureHistory);
        Assert.Empty(lotHistory);
    }

    private static async Task<OfferOutcomeSeedResult> SeedProcedureForOffersAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-SQL-OO-{Guid.NewGuid():N}"[..16],
            Name = "Offer/Outcome SQL lot",
            Status = LotStatus.InProcurement
        };

        var firstContractor = CreateContractor("7700000301", "SQL contractor 1");
        var secondContractor = CreateContractor("7700000302", "SQL contractor 2");

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = ProcedureApprovalMode.InSystem,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Offer/Outcome SQL procedure",
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
        await db.Set<Contractor>().AddRangeAsync(firstContractor, secondContractor);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);
        await db.SaveChangesAsync();

        return new OfferOutcomeSeedResult(procedure.Id, lot.Id, firstContractor.Id, secondContractor.Id);
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
            CapacityHours = 100m,
            CurrentRating = 4.0m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
    }

    private sealed record OfferOutcomeSeedResult(
        Guid ProcedureId,
        Guid LotId,
        Guid FirstContractorId,
        Guid SecondContractorId);
}
