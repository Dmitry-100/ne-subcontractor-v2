using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorRatingsServiceTests
{
    [Fact]
    public async Task RecalculateRatingsAsync_ShouldCreateHistoryAndUpdateContractorRating()
    {
        await using var db = TestDbContextFactory.Create("rating-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var service = new ContractorRatingsService(db, new FixedDateTimeProvider(seed.UtcNow));

        var result = await service.RecalculateRatingsAsync(new RecalculateContractorRatingsRequest
        {
            IncludeInactiveContractors = false,
            Reason = "Integration test recalculation."
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

    [Fact]
    public async Task UpsertManualAssessmentAsync_ShouldPersistAssessmentAndHistory()
    {
        await using var db = TestDbContextFactory.Create("rating-user");
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
                Comment = "Экспертная оценка для теста."
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

    [Fact]
    public async Task GetAnalyticsAsync_ShouldReturnDeltaAfterMultipleRecalculations()
    {
        await using var db = TestDbContextFactory.Create("rating-user");
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
                Comment = "Поднятие рейтинга для проверки дельты."
            });

        var analytics = await service.GetAnalyticsAsync();
        var row = Assert.Single(analytics);
        Assert.Equal(seed.ContractorId, row.ContractorId);
        Assert.NotNull(row.RatingDelta);
        Assert.NotNull(row.LastCalculatedAtUtc);
        Assert.False(string.IsNullOrWhiteSpace(row.ModelVersionCode));
    }

    private static async Task<RatingSeedResult> SeedContractorRatingDataAsync(Infrastructure.Persistence.AppDbContext db)
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
