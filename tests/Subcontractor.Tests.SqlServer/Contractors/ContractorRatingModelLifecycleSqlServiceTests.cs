using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Contractors;

[Trait("SqlSuite", "Core")]
public sealed class ContractorRatingModelLifecycleSqlServiceTests
{
    [SqlFact]
    public async Task EnsureActiveModelAsync_WhenActiveModelHasNoWeights_ShouldBackfillDefaultWeights()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-lifecycle-user");
        await using var db = database.CreateDbContext("rating-lifecycle-user");

        var existing = new ContractorRatingModelVersion
        {
            VersionCode = "R-EMPTY-SQL",
            Name = "Empty SQL model",
            IsActive = true
        };

        await db.Set<ContractorRatingModelVersion>().AddAsync(existing);
        await db.SaveChangesAsync();

        var service = new ContractorRatingModelLifecycleService(
            db,
            new FixedDateTimeProvider(new DateTimeOffset(2026, 4, 10, 10, 0, 0, TimeSpan.Zero)));

        var model = await service.EnsureActiveModelAsync();

        Assert.Equal(existing.Id, model.Id);
        Assert.Equal(5, model.Weights.Count);

        var persistedModel = await db.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .SingleAsync(x => x.Id == existing.Id);
        Assert.Equal(5, persistedModel.Weights.Count);
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
