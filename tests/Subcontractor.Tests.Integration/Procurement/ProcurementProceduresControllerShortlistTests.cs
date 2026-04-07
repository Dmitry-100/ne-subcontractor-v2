using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcurementProceduresControllerShortlistTests
{
    [Fact]
    public async Task GetShortlistRecommendations_UnknownProcedure_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var controller = CreateController(db);

        var result = await controller.GetShortlistRecommendations(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task ApplyShortlistRecommendations_ShouldReturnOkPayload()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db);
        var controller = CreateController(db);

        var result = await controller.ApplyShortlistRecommendations(
            procedureId,
            new ApplyProcedureShortlistRecommendationsRequest
            {
                MaxIncluded = 5,
                AdjustmentReason = "Автоподбор shortlist"
            },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ApplyProcedureShortlistRecommendationsResultDto>(ok.Value);
        Assert.Equal(1, payload.IncludedCandidates);
        Assert.Single(payload.Shortlist);
    }

    private static ProcurementProceduresController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var contractorsService = new ContractorsService(db);
        var proceduresService = new ProcurementProceduresService(
            db,
            new TestCurrentUserService("proc-user"),
            contractorsService);
        return new ProcurementProceduresController(proceduresService);
    }

    private static async Task<Guid> SeedProcedureAsync(Infrastructure.Persistence.AppDbContext db)
    {
        var lot = new Lot
        {
            Code = "LOT-CTRL-001",
            Name = "Controller shortlist lot",
            Status = LotStatus.InProcurement,
            Items =
            [
                new LotItem
                {
                    ObjectWbs = "S.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        };

        var contractor = new Contractor
        {
            Inn = "7700099999",
            Name = "Controller contractor",
            City = "Moscow",
            ContactName = "Controller",
            Phone = "+70000000000",
            Email = "controller@example.local",
            CapacityHours = 100m,
            CurrentRating = 4.5m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active,
            Qualifications =
            [
                new ContractorQualification
                {
                    DisciplineCode = "PIPING"
                }
            ]
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = ProcurementProcedureStatus.Sent,
            PurchaseTypeCode = "OPEN",
            ObjectName = "Controller procedure",
            WorkScope = "Scope",
            CustomerName = "Customer",
            LeadOfficeCode = "MAIN",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5"
        };

        await db.Set<Lot>().AddAsync(lot);
        await db.Set<Contractor>().AddAsync(contractor);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);
        await db.SaveChangesAsync();
        return procedure.Id;
    }
}
