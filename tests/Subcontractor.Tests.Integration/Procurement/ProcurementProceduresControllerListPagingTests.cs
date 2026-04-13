using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcurementProceduresControllerListPagingTests
{
    [Fact]
    public async Task List_WithPagingParameters_ShouldReturnPageEnvelope()
    {
        await using var db = TestDbContextFactory.Create("proc-controller-page");
        await SeedProceduresAsync(db);

        var controller = CreateController(db);
        var result = await controller.List(
            search: null,
            status: null,
            lotId: null,
            skip: 0,
            take: 2,
            requireTotalCount: true,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsType<ProcedureListPageDto>(ok.Value);

        Assert.Equal(4, payload.TotalCount);
        Assert.Equal(0, payload.Skip);
        Assert.Equal(2, payload.Take);
        Assert.Equal(2, payload.Items.Count);
    }

    [Fact]
    public async Task List_WithoutPaging_ShouldReturnLegacyArrayContract()
    {
        await using var db = TestDbContextFactory.Create("proc-controller-page");
        await SeedProceduresAsync(db);

        var controller = CreateController(db);
        var result = await controller.List(
            search: null,
            status: null,
            lotId: null,
            skip: null,
            take: null,
            requireTotalCount: false,
            cancellationToken: CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<ProcedureListItemDto>>(ok.Value);
        Assert.Equal(4, payload.Count);
    }

    private static ProcurementProceduresController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var proceduresService = new ProcurementProceduresService(
            db,
            new TestCurrentUserService("proc-controller-page"));
        return new ProcurementProceduresController(proceduresService);
    }

    private static async Task SeedProceduresAsync(Infrastructure.Persistence.AppDbContext db)
    {
        var lot = new Lot
        {
            Code = "LOT-PROC-C-001",
            Name = "Controller procedures lot",
            Status = LotStatus.InProcurement
        };

        await db.Set<Lot>().AddAsync(lot);
        await db.Set<ProcurementProcedure>().AddRangeAsync(
            CreateProcedure(lot.Id, "Controller Procedure 1", ProcurementProcedureStatus.Created),
            CreateProcedure(lot.Id, "Controller Procedure 2", ProcurementProcedureStatus.DocumentsPreparation),
            CreateProcedure(lot.Id, "Controller Procedure 3", ProcurementProcedureStatus.OnApproval),
            CreateProcedure(lot.Id, "Controller Procedure 4", ProcurementProcedureStatus.Sent));
        await db.SaveChangesAsync();
    }

    private static ProcurementProcedure CreateProcedure(Guid lotId, string objectName, ProcurementProcedureStatus status)
    {
        return new ProcurementProcedure
        {
            LotId = lotId,
            Status = status,
            PurchaseTypeCode = "OPEN",
            ObjectName = objectName,
            WorkScope = "Scope",
            CustomerName = "Customer",
            LeadOfficeCode = "MAIN",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5"
        };
    }
}
