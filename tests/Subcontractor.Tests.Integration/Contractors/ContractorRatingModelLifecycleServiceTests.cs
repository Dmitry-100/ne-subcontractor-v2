using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorRatingModelLifecycleServiceTests
{
    [Fact]
    public async Task EnsureActiveModelAsync_WhenModelMissing_ShouldCreateBaselineModel()
    {
        await using var db = TestDbContextFactory.Create("rating-lifecycle-user");
        var service = new ContractorRatingModelLifecycleService(
            db,
            new FixedDateTimeProvider(new DateTimeOffset(2026, 4, 10, 10, 0, 0, TimeSpan.Zero)));

        var model = await service.EnsureActiveModelAsync();

        Assert.True(model.IsActive);
        Assert.Equal("R-BASE", model.VersionCode);
        Assert.Equal(5, model.Weights.Count);

        var modelCount = await db.Set<ContractorRatingModelVersion>().CountAsync();
        Assert.Equal(1, modelCount);
    }

    [Fact]
    public async Task EnsureActiveModelAsync_WhenActiveModelHasNoWeights_ShouldBackfillDefaultWeights()
    {
        await using var db = TestDbContextFactory.Create("rating-lifecycle-user");
        var existing = new ContractorRatingModelVersion
        {
            VersionCode = "R-EMPTY",
            Name = "Empty model",
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

    [Fact]
    public async Task UpsertActiveModelAsync_WithDuplicateVersionCode_ShouldGenerateUniqueCode_AndKeepSingleActiveModel()
    {
        await using var db = TestDbContextFactory.Create("rating-lifecycle-user");
        var service = new ContractorRatingModelLifecycleService(
            db,
            new FixedDateTimeProvider(new DateTimeOffset(2026, 4, 10, 10, 0, 0, TimeSpan.Zero)));

        var first = await service.UpsertActiveModelAsync(new UpsertContractorRatingModelRequest
        {
            VersionCode = "R-LIFECYCLE",
            Name = "Lifecycle model #1"
        });

        var second = await service.UpsertActiveModelAsync(new UpsertContractorRatingModelRequest
        {
            VersionCode = "R-LIFECYCLE",
            Name = "Lifecycle model #2"
        });

        Assert.Equal("R-LIFECYCLE", first.VersionCode);
        Assert.Equal("R-LIFECYCLE-2", second.VersionCode);

        var models = await db.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();

        Assert.Equal(2, models.Count);
        Assert.False(models[0].IsActive);
        Assert.True(models[1].IsActive);
        Assert.All(models, model => Assert.Equal(5, model.Weights.Count));
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
