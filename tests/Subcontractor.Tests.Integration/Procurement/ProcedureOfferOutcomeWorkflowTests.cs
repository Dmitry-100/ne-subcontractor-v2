using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcedureOfferOutcomeWorkflowTests
{
    [Fact]
    public async Task UpsertOffersAsync_WithSentProcedure_ShouldPersistOffersAndMoveStatusToOffersReceived()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.Sent);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var offers = await service.UpsertOffersAsync(setup.ProcedureId, new UpdateProcedureOffersRequest
        {
            Items =
            [
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.FirstContractorId,
                    OfferNumber = " OFR-001 ",
                    AmountWithoutVat = 100m,
                    VatAmount = 20m,
                    TotalAmount = 120m,
                    CurrencyCode = " rub ",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Pending
                },
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.SecondContractorId,
                    OfferNumber = "OFR-002",
                    AmountWithoutVat = 90m,
                    VatAmount = 18m,
                    TotalAmount = 108m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Pending
                }
            ]
        });

        Assert.Equal(2, offers.Count);
        Assert.Equal("RUB", offers[0].CurrencyCode);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == setup.ProcedureId);
        var history = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId && x.ToStatus == ProcurementProcedureStatus.OffersReceived)
            .ToListAsync();

        Assert.Equal(ProcurementProcedureStatus.OffersReceived, procedure.Status);
        Assert.Single(history);
        Assert.Equal("Offers received", history[0].Reason);
    }

    [Fact]
    public async Task UpsertOutcomeAsync_WithWinner_ShouldMarkWinnerAndMoveProcedureAndLotStatuses()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.OffersReceived);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        await service.UpsertOffersAsync(setup.ProcedureId, new UpdateProcedureOffersRequest
        {
            Items =
            [
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.FirstContractorId,
                    OfferNumber = "OFR-W1",
                    AmountWithoutVat = 100m,
                    VatAmount = 20m,
                    TotalAmount = 120m,
                    CurrencyCode = "RUB",
                    QualificationStatus = ProcedureOfferQualificationStatus.Qualified,
                    DecisionStatus = ProcedureOfferDecisionStatus.Winner
                },
                new UpsertProcedureOfferItemRequest
                {
                    ContractorId = setup.SecondContractorId,
                    OfferNumber = "OFR-W2",
                    AmountWithoutVat = 95m,
                    VatAmount = 19m,
                    TotalAmount = 114m,
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
            Comment = "Победитель определён"
        });

        Assert.Equal(setup.SecondContractorId, outcome.WinnerContractorId);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == setup.ProcedureId);
        var lot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == setup.LotId);
        var offers = await db.Set<ProcedureOffer>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .OrderBy(x => x.ContractorId)
            .ToListAsync();

        Assert.Equal(ProcurementProcedureStatus.DecisionMade, procedure.Status);
        Assert.Equal(LotStatus.ContractorSelected, lot.Status);
        Assert.Equal(ProcedureOfferDecisionStatus.Rejected, offers.Single(x => x.ContractorId == setup.FirstContractorId).DecisionStatus);
        Assert.Equal(ProcedureOfferDecisionStatus.Winner, offers.Single(x => x.ContractorId == setup.SecondContractorId).DecisionStatus);
    }

    [Fact]
    public async Task UpsertOutcomeAsync_WhenCanceledWithoutReason_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.OffersReceived);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertOutcomeAsync(
            setup.ProcedureId,
            new UpdateProcedureOutcomeRequest
            {
                IsCanceled = true,
                CancellationReason = "   "
            }));

        Assert.Equal(
            "CancellationReason is required when outcome is marked as canceled. (Parameter 'CancellationReason')",
            error.Message);
    }

    private static async Task<OfferOutcomeSeedResult> SeedProcedureForOffersAsync(
        Infrastructure.Persistence.AppDbContext db,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-OO-{Guid.NewGuid():N}"[..16],
            Name = "Offer/Outcome lot",
            Status = LotStatus.InProcurement
        };

        var firstContractor = CreateContractor("7700000201", "Offer contractor 1");
        var secondContractor = CreateContractor("7700000202", "Offer contractor 2");

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = ProcedureApprovalMode.InSystem,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Offer/Outcome procedure",
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
