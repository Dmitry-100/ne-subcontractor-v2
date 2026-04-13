using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Imports;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Foundation;

[Trait("SqlSuite", "Full")]
public sealed class SqlServerDeleteBehaviorTests
{
    [SqlFact]
    public async Task HardDelete_MdrCard_ShouldCascadeDeleteRows()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();

        var contract = new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = "CTR-CASCADE-001",
            Status = ContractStatus.Active,
            TotalAmount = 100m
        };
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var card = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "Cascade card",
            ReportingDate = new DateTime(2026, 11, 1),
            SortOrder = 0,
            Rows =
            [
                new ContractMdrRow
                {
                    RowCode = "ROW-1",
                    Description = "Cascade row",
                    UnitCode = "MH",
                    PlanValue = 10m,
                    ForecastValue = 11m,
                    FactValue = 9m,
                    SortOrder = 0
                }
            ]
        };
        await db.Set<ContractMdrCard>().AddAsync(card);
        await db.SaveChangesAsync();

        var rowCountBeforeDelete = await db.Set<ContractMdrRow>()
            .IgnoreQueryFilters()
            .CountAsync(x => x.CardId == card.Id);
        Assert.Equal(1, rowCountBeforeDelete);

        var cardsTable = GetQualifiedTableName<ContractMdrCard>(db);
        var deleteCardSql = $"DELETE FROM {cardsTable} WHERE Id = @p0";
        await db.Database.ExecuteSqlRawAsync(deleteCardSql, card.Id);

        var rowCountAfterDelete = await db.Set<ContractMdrRow>()
            .IgnoreQueryFilters()
            .CountAsync(x => x.CardId == card.Id);
        Assert.Equal(0, rowCountAfterDelete);
    }

    [SqlFact]
    public async Task HardDelete_SourceDataImportBatch_WithInboxReference_ShouldFailByRestrictFk()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();

        var batch = new SourceDataImportBatch
        {
            FileName = "restrict-batch.xml",
            Status = SourceDataImportBatchStatus.Uploaded
        };
        await db.Set<SourceDataImportBatch>().AddAsync(batch);
        await db.SaveChangesAsync();

        await db.Set<XmlSourceDataImportInboxItem>().AddAsync(new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "source.xml",
            XmlContent = "<root />",
            SourceDataImportBatchId = batch.Id
        });
        await db.SaveChangesAsync();

        var batchesTable = GetQualifiedTableName<SourceDataImportBatch>(db);
        var deleteBatchSql = $"DELETE FROM {batchesTable} WHERE Id = @p0";

        var error = await Assert.ThrowsAsync<SqlException>(() =>
            db.Database.ExecuteSqlRawAsync(deleteBatchSql, batch.Id));

        Assert.Contains("REFERENCE", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static string GetQualifiedTableName<TEntity>(Subcontractor.Infrastructure.Persistence.AppDbContext dbContext)
        where TEntity : class
    {
        var entityType = dbContext.Model.FindEntityType(typeof(TEntity))
                         ?? throw new InvalidOperationException($"EF entity metadata is not found for {typeof(TEntity).Name}.");
        var table = entityType.GetTableName()
                    ?? throw new InvalidOperationException($"Table name is not configured for {typeof(TEntity).Name}.");
        var schema = entityType.GetSchema();

        return string.IsNullOrWhiteSpace(schema)
            ? $"[{table}]"
            : $"[{schema}].[{table}]";
    }
}
