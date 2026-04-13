using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Contractors;

[Trait("SqlSuite", "Core")]
public sealed class ContractorRatingsSqlServiceTests
{
    [SqlFact]
    public async Task RecalculateRatingsAsync_ShouldCreateHistoryAndUpdateContractorRating()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-user");
        await using var db = database.CreateDbContext("rating-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var service = new ContractorRatingsService(db, new FixedDateTimeProvider(seed.UtcNow));

        var result = await service.RecalculateRatingsAsync(new RecalculateContractorRatingsRequest
        {
            IncludeInactiveContractors = false,
            Reason = "SQL integration test recalculation."
        });

        Assert.Equal(1, result.ProcessedContractors);
        Assert.Equal(1, result.UpdatedContractors);

        var contractor = await db.Set<Contractor>().SingleAsync(x => x.Id == seed.ContractorId);
        Assert.True(contractor.CurrentRating > 0m);

        var history = await db.Set<ContractorRatingHistoryEntry>()
            .Where(x => x.ContractorId == seed.ContractorId)
            .ToListAsync();
        Assert.Single(history);
        Assert.Equal(ContractorRatingRecordSourceType.AutoRecalculation, history[0].SourceType);
    }

    [SqlFact]
    public async Task UpsertManualAssessmentAsync_ShouldPersistAssessmentAndHistory()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-user");
        await using var db = database.CreateDbContext("rating-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var service = new ContractorRatingsService(db, new FixedDateTimeProvider(seed.UtcNow));

        await service.RecalculateRatingsAsync(new RecalculateContractorRatingsRequest
        {
            IncludeInactiveContractors = false
        });

        var assessment = await service.UpsertManualAssessmentAsync(
            seed.ContractorId,
            new UpsertContractorRatingManualAssessmentRequest
            {
                Score = 4.8m,
                Comment = "SQL integration expert score."
            });

        Assert.Equal(seed.ContractorId, assessment.ContractorId);
        Assert.Equal(4.8m, assessment.Score);

        var manualRecords = await db.Set<ContractorRatingManualAssessment>()
            .Where(x => x.ContractorId == seed.ContractorId)
            .ToListAsync();
        Assert.Single(manualRecords);

        var latestHistory = await db.Set<ContractorRatingHistoryEntry>()
            .Where(x => x.ContractorId == seed.ContractorId)
            .OrderByDescending(x => x.CalculatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstAsync();
        Assert.Equal(ContractorRatingRecordSourceType.ManualAssessment, latestHistory.SourceType);
        Assert.NotNull(latestHistory.ManualAssessmentId);
    }

    [SqlFact]
    public async Task UpsertManualAssessmentAsync_WithOutOfRangeScore_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-user");
        await using var db = database.CreateDbContext("rating-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var service = new ContractorRatingsService(db, new FixedDateTimeProvider(seed.UtcNow));

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertManualAssessmentAsync(
            seed.ContractorId,
            new UpsertContractorRatingManualAssessmentRequest
            {
                Score = 7.1m,
                Comment = "Out of range"
            }));

        Assert.Equal("Manual assessment score must be in range [0..5]. (Parameter 'Score')", error.Message);
        Assert.Equal("Score", error.ParamName);

        var contractor = await db.Set<Contractor>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == seed.ContractorId);
        var manualRows = await db.Set<ContractorRatingManualAssessment>()
            .AsNoTracking()
            .Where(x => x.ContractorId == seed.ContractorId)
            .ToListAsync();
        var historyRows = await db.Set<ContractorRatingHistoryEntry>()
            .AsNoTracking()
            .Where(x => x.ContractorId == seed.ContractorId)
            .ToListAsync();

        Assert.Equal(0m, contractor.CurrentRating);
        Assert.Empty(manualRows);
        Assert.Empty(historyRows);
    }

    [SqlFact]
    public async Task GetAnalyticsAsync_ShouldReturnDeltaAfterMultipleRecalculations()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-user");
        await using var db = database.CreateDbContext("rating-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var service = new ContractorRatingsService(db, new FixedDateTimeProvider(seed.UtcNow));

        await service.RecalculateRatingsAsync(new RecalculateContractorRatingsRequest
        {
            IncludeInactiveContractors = false
        });

        await service.UpsertManualAssessmentAsync(
            seed.ContractorId,
            new UpsertContractorRatingManualAssessmentRequest
            {
                Score = 5.0m,
                Comment = "Raise rating for SQL analytics delta."
            });

        var analytics = await service.GetAnalyticsAsync();
        var row = Assert.Single(analytics);
        Assert.Equal(seed.ContractorId, row.ContractorId);
        Assert.NotNull(row.RatingDelta);
        Assert.NotNull(row.LastCalculatedAtUtc);
        Assert.False(string.IsNullOrWhiteSpace(row.ModelVersionCode));
    }

    [SqlFact]
    public async Task RecalculateRatingsAsync_WhenIncludeInactiveIsFalse_ShouldSkipInactiveContractors()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-user");
        await using var db = database.CreateDbContext("rating-user");
        var seed = await SeedContractorRatingDataAsync(db);

        var inactiveContractor = new Contractor
        {
            Inn = "7701234599",
            Name = "Inactive rating contractor",
            City = "Moscow",
            ContactName = "Inactive",
            Phone = "+70000000001",
            Email = "inactive-rating@test.local",
            CapacityHours = 100m,
            CurrentRating = 2.4m,
            CurrentLoadPercent = 20m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Blocked
        };

        await db.Set<Contractor>().AddAsync(inactiveContractor);
        await db.SaveChangesAsync();

        var service = new ContractorRatingsService(db, new FixedDateTimeProvider(seed.UtcNow));
        var result = await service.RecalculateRatingsAsync(new RecalculateContractorRatingsRequest
        {
            IncludeInactiveContractors = false,
            Reason = "Active-only SQL run."
        });

        Assert.Equal(1, result.ProcessedContractors);

        var inactiveReloaded = await db.Set<Contractor>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == inactiveContractor.Id);
        var inactiveHistory = await db.Set<ContractorRatingHistoryEntry>()
            .AsNoTracking()
            .Where(x => x.ContractorId == inactiveContractor.Id)
            .ToListAsync();
        var activeHistory = await db.Set<ContractorRatingHistoryEntry>()
            .AsNoTracking()
            .Where(x => x.ContractorId == seed.ContractorId)
            .ToListAsync();

        Assert.Equal(2.4m, inactiveReloaded.CurrentRating);
        Assert.Empty(inactiveHistory);
        Assert.Single(activeHistory);
    }

    [SqlFact]
    public async Task UpsertActiveModelAsync_WithDuplicateVersionCode_ShouldGenerateUniqueCode_AndKeepSingleActiveModel()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("rating-user");
        await using var db = database.CreateDbContext("rating-user");
        var now = new DateTimeOffset(2026, 12, 2, 9, 0, 0, TimeSpan.Zero);
        var service = new ContractorRatingsService(db, new FixedDateTimeProvider(now));

        var first = await service.UpsertActiveModelAsync(new UpsertContractorRatingModelRequest
        {
            VersionCode = "R-SQL",
            Name = "SQL model #1"
        });

        var second = await service.UpsertActiveModelAsync(new UpsertContractorRatingModelRequest
        {
            VersionCode = "R-SQL",
            Name = "SQL model #2"
        });

        Assert.Equal("R-SQL", first.VersionCode);
        Assert.Equal("R-SQL-2", second.VersionCode);

        var models = await db.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();

        Assert.Equal(2, models.Count);
        Assert.False(models[0].IsActive);
        Assert.True(models[1].IsActive);
        Assert.All(models, model => Assert.Equal(5, model.Weights.Count));
    }

    private static async Task<RatingSeedResult> SeedContractorRatingDataAsync(Subcontractor.Infrastructure.Persistence.AppDbContext db)
    {
        var utcNow = new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

        var contractor = new Contractor
        {
            Inn = "7701234500",
            Name = "Rating test contractor",
            City = "Moscow",
            ContactName = "Test",
            Phone = "+70000000000",
            Email = "rating@test.local",
            CapacityHours = 100m,
            CurrentRating = 0m,
            CurrentLoadPercent = 60m,
            ReliabilityClass = ReliabilityClass.B,
            Status = ContractorStatus.Active
        };

        var lot = new Lot
        {
            Code = "LOT-RATING-001",
            Name = "Rating test lot",
            Status = LotStatus.Contracted,
            Items =
            [
                new LotItem
                {
                    ObjectWbs = "R.01",
                    DisciplineCode = "PIPING",
                    ManHours = 40m
                }
            ]
        };

        var contract = new Contract
        {
            LotId = lot.Id,
            ProcedureId = Guid.NewGuid(),
            ContractorId = contractor.Id,
            ContractNumber = "CTR-RATING-001",
            Status = ContractStatus.Active,
            TotalAmount = 100000m
        };

        var milestone = new ContractMilestone
        {
            ContractId = contract.Id,
            Title = "Rating milestone",
            PlannedDate = utcNow.UtcDateTime.Date.AddDays(-3),
            ProgressPercent = 40m,
            SortOrder = 0
        };

        await db.Set<Contractor>().AddAsync(contractor);
        await db.Set<Lot>().AddAsync(lot);
        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMilestone>().AddAsync(milestone);
        await db.SaveChangesAsync();

        return new RatingSeedResult(contractor.Id, utcNow);
    }

    private sealed record RatingSeedResult(Guid ContractorId, DateTimeOffset UtcNow);

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        public FixedDateTimeProvider(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }
}
