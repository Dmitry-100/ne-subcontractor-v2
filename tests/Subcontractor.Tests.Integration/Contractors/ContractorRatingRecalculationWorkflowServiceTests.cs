using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorRatingRecalculationWorkflowServiceTests
{
    [Fact]
    public async Task RecalculateAsync_EmptyContractors_ShouldReturnZero()
    {
        await using var db = TestDbContextFactory.Create("rating-workflow-user");
        var utcNow = new DateTimeOffset(2026, 12, 2, 10, 0, 0, TimeSpan.Zero);
        var service = new ContractorRatingRecalculationWorkflowService(db, new FixedDateTimeProvider(utcNow));

        var processed = await service.RecalculateAsync(
            Array.Empty<Contractor>(),
            new ContractorRatingModelVersion(),
            ContractorRatingRecordSourceType.AutoRecalculation,
            manualAssessmentMap: null,
            reason: null,
            CancellationToken.None);

        Assert.Equal(0, processed);
    }

    [Fact]
    public async Task RecalculateAsync_AutoRecalculation_ShouldUpdateRatingAndPersistHistory()
    {
        await using var db = TestDbContextFactory.Create("rating-workflow-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var dateTimeProvider = new FixedDateTimeProvider(seed.UtcNow);
        var bootstrapService = new ContractorRatingsService(db, dateTimeProvider);
        await bootstrapService.GetActiveModelAsync();

        var model = await db.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .SingleAsync(x => x.IsActive);
        var contractors = await db.Set<Contractor>()
            .Where(x => x.Id == seed.ContractorId)
            .ToListAsync();
        var workflowService = new ContractorRatingRecalculationWorkflowService(db, dateTimeProvider);

        var updated = await workflowService.RecalculateAsync(
            contractors,
            model,
            ContractorRatingRecordSourceType.AutoRecalculation,
            manualAssessmentMap: null,
            reason: "Workflow service integration test.",
            CancellationToken.None);

        Assert.Equal(1, updated);

        var contractor = await db.Set<Contractor>().SingleAsync(x => x.Id == seed.ContractorId);
        Assert.True(contractor.CurrentRating > 0m);

        var history = await db.Set<ContractorRatingHistoryEntry>()
            .Where(x => x.ContractorId == seed.ContractorId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();
        Assert.Single(history);
        Assert.Equal(ContractorRatingRecordSourceType.AutoRecalculation, history[0].SourceType);
        Assert.Null(history[0].ManualAssessmentId);
    }

    [Fact]
    public async Task RecalculateAsync_WithManualAssessmentMap_ShouldLinkManualAssessment()
    {
        await using var db = TestDbContextFactory.Create("rating-workflow-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var dateTimeProvider = new FixedDateTimeProvider(seed.UtcNow);
        var bootstrapService = new ContractorRatingsService(db, dateTimeProvider);
        await bootstrapService.GetActiveModelAsync();

        var model = await db.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .SingleAsync(x => x.IsActive);
        var contractors = await db.Set<Contractor>()
            .Where(x => x.Id == seed.ContractorId)
            .ToListAsync();

        var assessment = new ContractorRatingManualAssessment
        {
            ContractorId = seed.ContractorId,
            ModelVersionId = model.Id,
            Score = 4.9m,
            Comment = "Manual score from workflow test."
        };
        await db.Set<ContractorRatingManualAssessment>().AddAsync(assessment);
        await db.SaveChangesAsync();

        var workflowService = new ContractorRatingRecalculationWorkflowService(db, dateTimeProvider);
        var updated = await workflowService.RecalculateAsync(
            contractors,
            model,
            ContractorRatingRecordSourceType.ManualAssessment,
            manualAssessmentMap: new Dictionary<Guid, ContractorRatingManualAssessment>
            {
                [seed.ContractorId] = assessment
            },
            reason: "Manual workflow service integration test.",
            CancellationToken.None);

        Assert.Equal(1, updated);

        var latestHistory = await db.Set<ContractorRatingHistoryEntry>()
            .Where(x => x.ContractorId == seed.ContractorId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstAsync();
        Assert.Equal(ContractorRatingRecordSourceType.ManualAssessment, latestHistory.SourceType);
        Assert.Equal(assessment.Id, latestHistory.ManualAssessmentId);
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
