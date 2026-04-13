using Microsoft.EntityFrameworkCore;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Sla;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Foundation;

[Trait("SqlSuite", "Core")]
public sealed class SqlServerConstraintRegressionTests
{
    [SqlFact]
    public async Task UniqueIndex_OnSourceDataImportRows_BatchIdAndRowNumber_ShouldBeEnforced()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var context = database.CreateDbContext();

        var batch = new SourceDataImportBatch
        {
            FileName = "constraint-batch.xlsx",
            Status = SourceDataImportBatchStatus.Uploaded
        };
        await context.Set<SourceDataImportBatch>().AddAsync(batch);
        await context.SaveChangesAsync();

        await context.Set<SourceDataImportRow>().AddAsync(new SourceDataImportRow
        {
            BatchId = batch.Id,
            RowNumber = 1,
            ProjectCode = "PRJ-001",
            ObjectWbs = "WBS.001",
            DisciplineCode = "PIPING",
            ManHours = 10m,
            IsValid = true
        });
        await context.SaveChangesAsync();

        await context.Set<SourceDataImportRow>().AddAsync(new SourceDataImportRow
        {
            BatchId = batch.Id,
            RowNumber = 1,
            ProjectCode = "PRJ-001",
            ObjectWbs = "WBS.002",
            DisciplineCode = "PIPING",
            ManHours = 12m,
            IsValid = true
        });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [SqlFact]
    public async Task UniqueIndex_OnSlaViolationCompositeKey_ShouldBeEnforced()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var context = database.CreateDbContext();

        var dueDate = new DateTime(2026, 12, 5);
        var entityId = Guid.NewGuid();

        await context.Set<SlaViolation>().AddAsync(new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractMilestone,
            EntityId = entityId,
            DueDate = dueDate,
            Severity = SlaViolationSeverity.Warning,
            Title = "First violation",
            FirstDetectedAtUtc = dueDate,
            LastDetectedAtUtc = dueDate
        });
        await context.SaveChangesAsync();

        await context.Set<SlaViolation>().AddAsync(new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractMilestone,
            EntityId = entityId,
            DueDate = dueDate,
            Severity = SlaViolationSeverity.Warning,
            Title = "Duplicate violation",
            FirstDetectedAtUtc = dueDate,
            LastDetectedAtUtc = dueDate
        });

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [SqlFact]
    public async Task UniqueIndex_OnContracts_ContractNumber_ShouldBeEnforcedForActiveRows()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var context = database.CreateDbContext();

        await context.Set<Contract>().AddAsync(CreateContract(
            contractNumber: "CTR-SQL-UNIQ-001",
            procedureId: Guid.NewGuid()));
        await context.SaveChangesAsync();

        await context.Set<Contract>().AddAsync(CreateContract(
            contractNumber: "CTR-SQL-UNIQ-001",
            procedureId: Guid.NewGuid()));

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [SqlFact]
    public async Task UniqueIndex_OnContracts_ProcedureId_ShouldBeEnforcedForActiveRows()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var context = database.CreateDbContext();

        var procedureId = Guid.NewGuid();
        await context.Set<Contract>().AddAsync(CreateContract(
            contractNumber: "CTR-SQL-UNIQ-010",
            procedureId: procedureId));
        await context.SaveChangesAsync();

        await context.Set<Contract>().AddAsync(CreateContract(
            contractNumber: "CTR-SQL-UNIQ-011",
            procedureId: procedureId));

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [SqlFact]
    public async Task UniqueIndex_OnContracts_FilteredByIsDeleted_ShouldAllowReuseAfterSoftDelete()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var context = database.CreateDbContext();

        var procedureId = Guid.NewGuid();
        var existing = CreateContract(
            contractNumber: "CTR-SQL-UNIQ-020",
            procedureId: procedureId);
        await context.Set<Contract>().AddAsync(existing);
        await context.SaveChangesAsync();

        context.Set<Contract>().Remove(existing);
        await context.SaveChangesAsync();

        await context.Set<Contract>().AddAsync(CreateContract(
            contractNumber: "CTR-SQL-UNIQ-020",
            procedureId: procedureId));
        await context.SaveChangesAsync();

        var activeContracts = await context.Set<Contract>()
            .AsNoTracking()
            .Where(x => x.ContractNumber == "CTR-SQL-UNIQ-020")
            .ToListAsync();
        var allContracts = await context.Set<Contract>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.ContractNumber == "CTR-SQL-UNIQ-020")
            .ToListAsync();

        Assert.Single(activeContracts);
        Assert.Equal(2, allContracts.Count);
        Assert.Single(allContracts.Where(x => x.IsDeleted));
    }

    private static Contract CreateContract(string contractNumber, Guid procedureId)
    {
        var startDate = DateTime.UtcNow.Date;
        return new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = procedureId,
            ContractorId = Guid.NewGuid(),
            ContractNumber = contractNumber,
            SigningDate = startDate,
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = startDate,
            EndDate = startDate.AddDays(10),
            Status = ContractStatus.Draft
        };
    }
}
