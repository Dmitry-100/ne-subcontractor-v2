using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcedureLifecycleServiceTests
{
    [Fact]
    public async Task ListPageAsync_ShouldReturnPageAndTotalCount()
    {
        await using var db = TestDbContextFactory.Create("proc-lifecycle-page");
        var lot = new Lot
        {
            Code = "LOT-PROC-PAGE-001",
            Name = "Procedure page lot",
            Status = LotStatus.InProcurement
        };

        await db.Set<Lot>().AddAsync(lot);
        await db.Set<ProcurementProcedure>().AddRangeAsync(
            CreateProcedure(lot.Id, "Procedure 1", ProcurementProcedureStatus.Created),
            CreateProcedure(lot.Id, "Procedure 2", ProcurementProcedureStatus.DocumentsPreparation),
            CreateProcedure(lot.Id, "Procedure 3", ProcurementProcedureStatus.OnApproval),
            CreateProcedure(lot.Id, "Procedure 4", ProcurementProcedureStatus.Sent));
        await db.SaveChangesAsync();

        var service = new ProcedureLifecycleService(db, new ProcedureAttachmentBindingService(db));
        var page = await service.ListPageAsync(
            search: null,
            status: null,
            lotId: null,
            skip: 0,
            take: 2,
            cancellationToken: CancellationToken.None);

        Assert.Equal(4, page.TotalCount);
        Assert.Equal(0, page.Skip);
        Assert.Equal(2, page.Take);
        Assert.Equal(2, page.Items.Count);
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
