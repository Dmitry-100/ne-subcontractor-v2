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

public sealed class ContractorRatingWriteWorkflowServiceTests
{
    [Fact]
    public async Task UpsertManualAssessmentAsync_ShouldPersistAssessmentAndHistory()
    {
        await using var db = TestDbContextFactory.Create("rating-write-workflow-user");
        var seed = await SeedContractorRatingDataAsync(db);
        var service = CreateService(db, seed.UtcNow);

        var assessment = await service.UpsertManualAssessmentAsync(
            seed.ContractorId,
            new UpsertContractorRatingManualAssessmentRequest
            {
                Score = 4.7m,
                Comment = "Workflow manual assessment."
            });

        Assert.Equal(seed.ContractorId, assessment.ContractorId);
        Assert.Equal(4.7m, assessment.Score);

        var manualRows = await db.Set<ContractorRatingManualAssessment>()
            .Where(x => x.ContractorId == seed.ContractorId)
            .ToListAsync();
        Assert.Single(manualRows);

        var latestHistory = await db.Set<ContractorRatingHistoryEntry>()
            .Where(x => x.ContractorId == seed.ContractorId)
            .OrderByDescending(x => x.CalculatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstAsync();
        Assert.Equal(ContractorRatingRecordSourceType.ManualAssessment, latestHistory.SourceType);
        Assert.NotNull(latestHistory.ManualAssessmentId);
    }

    [Fact]
    public async Task RecalculateRatingsAsync_WithUnknownContractorId_ShouldThrowKeyNotFound()
    {
        await using var db = TestDbContextFactory.Create("rating-write-workflow-user");
        var service = CreateService(db, new DateTimeOffset(2026, 12, 1, 10, 0, 0, TimeSpan.Zero));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.RecalculateRatingsAsync(
            new RecalculateContractorRatingsRequest
            {
                ContractorId = Guid.NewGuid(),
                IncludeInactiveContractors = true
            },
            CancellationToken.None));
    }

    [Fact]
    public async Task RecalculateRatingsAsync_WhenIncludeInactiveIsFalse_ShouldSkipInactiveContractors()
    {
        await using var db = TestDbContextFactory.Create("rating-write-workflow-user");
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

        var service = CreateService(db, seed.UtcNow);
        var result = await service.RecalculateRatingsAsync(
            new RecalculateContractorRatingsRequest
            {
                IncludeInactiveContractors = false,
                Reason = "Active-only integration run."
            },
            CancellationToken.None);

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
