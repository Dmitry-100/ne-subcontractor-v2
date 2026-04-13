using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Procurement;

[Trait("SqlSuite", "Core")]
public sealed class ProcurementProceduresSqlDeleteRulesTests
{
    [SqlFact]
    public async Task DeleteAsync_WhenProcedureDoesNotExist_ShouldReturnFalse()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var deleted = await service.DeleteAsync(Guid.NewGuid());

        Assert.False(deleted);
    }

    [SqlFact]
    public async Task DeleteAsync_WithSentStatus_ShouldThrow_AndKeepProcedure()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var (lotId, procedureId) = await SeedProcedureAsync(db, ProcurementProcedureStatus.Sent);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteAsync(procedureId));
        Assert.Equal("Only draft/canceled procedures can be deleted.", error.Message);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        var lot = await db.Set<Lot>().AsNoTracking().SingleAsync(x => x.Id == lotId);

        Assert.Equal(ProcurementProcedureStatus.Sent, procedure.Status);
        Assert.Equal(LotStatus.InProcurement, lot.Status);
    }

    [SqlFact]
    public async Task DeleteAsync_WithCreatedStatus_ShouldDeleteProcedure()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var (lotId, procedureId) = await SeedProcedureAsync(db, ProcurementProcedureStatus.Created);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var deleted = await service.DeleteAsync(procedureId);

        Assert.True(deleted);
        Assert.False(await db.Set<ProcurementProcedure>().AsNoTracking().AnyAsync(x => x.Id == procedureId));
        Assert.True(await db.Set<Lot>().AsNoTracking().AnyAsync(x => x.Id == lotId));
    }

    [SqlFact]
    public async Task DeleteAsync_WithCanceledStatus_ShouldDeleteProcedure()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var (lotId, procedureId) = await SeedProcedureAsync(db, ProcurementProcedureStatus.Canceled);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var deleted = await service.DeleteAsync(procedureId);

        Assert.True(deleted);
        Assert.False(await db.Set<ProcurementProcedure>().AsNoTracking().AnyAsync(x => x.Id == procedureId));
        Assert.True(await db.Set<Lot>().AsNoTracking().AnyAsync(x => x.Id == lotId));
    }

    private static async Task<(Guid LotId, Guid ProcedureId)> SeedProcedureAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-{Guid.NewGuid():N}"[..11],
            Name = "SQL delete rules test lot",
            Status = LotStatus.InProcurement
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            PurchaseTypeCode = "PT-DELETE",
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
}
