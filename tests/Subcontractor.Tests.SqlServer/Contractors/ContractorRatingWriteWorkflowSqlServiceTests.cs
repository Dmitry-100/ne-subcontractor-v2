using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Contractors;

[Trait("SqlSuite", "Core")]
public sealed class ContractorRatingWriteWorkflowSqlServiceTests
{
    [SqlFact]
    public async Task RecalculateRatingsAsync_WithUnknownContractorId_ShouldThrow_AndNotWriteHistory()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-write-workflow-user");
        await using var db = database.CreateDbContext("rating-write-workflow-user");
        var service = CreateService(db, new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero));
        var contractorId = Guid.NewGuid();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.RecalculateRatingsAsync(
            new RecalculateContractorRatingsRequest
            {
                ContractorId = contractorId,
                IncludeInactiveContractors = true
            },
            CancellationToken.None));

        var historyRows = await db.Set<ContractorRatingHistoryEntry>()
            .AsNoTracking()
            .ToListAsync();

        Assert.Empty(historyRows);
    }

    private static ContractorRatingWriteWorkflowService CreateService(
        Infrastructure.Persistence.AppDbContext db,
        DateTimeOffset utcNow)
    {
        var dateTimeProvider = new FixedDateTimeProvider(utcNow);
        var modelLifecycleService = new ContractorRatingModelLifecycleService(db, dateTimeProvider);
        var recalculationWorkflowService = new ContractorRatingRecalculationWorkflowService(db, dateTimeProvider);

        return new ContractorRatingWriteWorkflowService(
            db,
            modelLifecycleService,
            recalculationWorkflowService);
    }

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        public FixedDateTimeProvider(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }
}
