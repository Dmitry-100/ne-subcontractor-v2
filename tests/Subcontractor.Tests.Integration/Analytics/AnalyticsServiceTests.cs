using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Sla;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Analytics;

public sealed class AnalyticsServiceTests
{
    [Fact]
    public async Task GetKpiDashboardAsync_ShouldReturnCalculatedMetrics()
    {
        await using var db = TestDbContextFactory.Create("analytics-user");
        var now = new DateTimeOffset(2026, 12, 20, 9, 0, 0, TimeSpan.Zero);
        await SeedAnalyticsDataAsync(db, now);

        var service = new AnalyticsService(db, new FixedDateTimeProvider(now));

        var result = await service.GetKpiDashboardAsync();

        Assert.Equal(3, result.LotFunnel.Sum(x => x.Count));
        Assert.Equal(2, result.ContractorLoad.ActiveContractors);
        Assert.Equal(1, result.ContractorLoad.OverloadedContractors);
        Assert.Equal(1, result.Sla.OpenWarnings);
        Assert.Equal(1, result.Sla.OpenOverdue);
        Assert.Equal(1, result.Sla.ResolvedLast30Days);
        Assert.Equal(1000m, result.ContractingAmounts.SignedAndActiveTotalAmount);
        Assert.Equal(500m, result.ContractingAmounts.ClosedTotalAmount);
        Assert.Equal(2, result.MdrProgress.RowsTotal);
        Assert.Equal(1, result.MdrProgress.RowsWithFact);
        Assert.Equal(50m, result.MdrProgress.FactCoveragePercent);
        Assert.Equal(180m, result.SubcontractingShare.TotalPlannedManHours);
        Assert.Equal(150m, result.SubcontractingShare.ContractedManHours);
        Assert.True((result.SubcontractingShare.SharePercent ?? 0m) > 80m);
        Assert.NotEmpty(result.TopContractors);
    }

    [Fact]
    public async Task GetViewCatalogAsync_ShouldContainRequiredViewDescriptors()
    {
        await using var db = TestDbContextFactory.Create("analytics-user");
        var service = new AnalyticsService(db, new FixedDateTimeProvider(DateTimeOffset.UtcNow));

        var catalog = await service.GetViewCatalogAsync();

        Assert.Contains(catalog, x => x.ViewName == "vwAnalytics_LotFunnel");
        Assert.Contains(catalog, x => x.ViewName == "vwAnalytics_ContractorRatings");
        Assert.True(catalog.Count >= 7);
    }

    private static async Task SeedAnalyticsDataAsync(Infrastructure.Persistence.AppDbContext db, DateTimeOffset now)
    {
        var contractorA = new Contractor
        {
            Inn = "7711000001",
            Name = "Analytics A",
            City = "Moscow",
            ContactName = "A",
            Phone = "+70000000001",
            Email = "analytics-a@test.local",
            CapacityHours = 150m,
            CurrentRating = 4.8m,
            CurrentLoadPercent = 85m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
        var contractorB = new Contractor
        {
            Inn = "7711000002",
            Name = "Analytics B",
            City = "Moscow",
            ContactName = "B",
            Phone = "+70000000002",
            Email = "analytics-b@test.local",
            CapacityHours = 100m,
            CurrentRating = 3.5m,
            CurrentLoadPercent = 120m,
            ReliabilityClass = ReliabilityClass.B,
            Status = ContractorStatus.Active
        };

        var lotDraft = new Lot
        {
            Code = "LOT-AN-001",
            Name = "Analytics Draft",
            Status = LotStatus.Draft,
            Items =
            [
                new LotItem { ObjectWbs = "A.01", DisciplineCode = "PIPING", ManHours = 30m }
            ]
        };
        var lotInProcurement = new Lot
        {
            Code = "LOT-AN-002",
            Name = "Analytics InProcurement",
            Status = LotStatus.InProcurement,
            Items =
            [
                new LotItem { ObjectWbs = "B.01", DisciplineCode = "ELEC", ManHours = 100m }
            ]
        };
        var lotContracted = new Lot
        {
            Code = "LOT-AN-003",
            Name = "Analytics Contracted",
            Status = LotStatus.Contracted,
            Items =
            [
                new LotItem { ObjectWbs = "C.01", DisciplineCode = "CIVIL", ManHours = 50m }
            ]
        };

        var signedContract = new Contract
        {
            LotId = lotInProcurement.Id,
            ProcedureId = Guid.NewGuid(),
            ContractorId = contractorA.Id,
            ContractNumber = "CTR-AN-001",
            Status = ContractStatus.Signed,
            TotalAmount = 1000m
        };
        var closedContract = new Contract
        {
            LotId = lotContracted.Id,
            ProcedureId = Guid.NewGuid(),
            ContractorId = contractorB.Id,
            ContractNumber = "CTR-AN-002",
            Status = ContractStatus.Closed,
            TotalAmount = 500m
        };

        var mdrCard = new ContractMdrCard
        {
            ContractId = signedContract.Id,
            Title = "MDR analytics card",
            ReportingDate = now.UtcDateTime.Date,
            SortOrder = 0
        };
        mdrCard.Rows.Add(new ContractMdrRow
        {
            RowCode = "ROW-1",
            Description = "Forecast row 1",
            UnitCode = "MH",
            PlanValue = 100m,
            ForecastValue = 95m,
            FactValue = 90m,
            SortOrder = 0
        });
        mdrCard.Rows.Add(new ContractMdrRow
        {
            RowCode = "ROW-2",
            Description = "Forecast row 2",
            UnitCode = "MH",
            PlanValue = 120m,
            ForecastValue = 110m,
            FactValue = 0m,
            SortOrder = 1
        });

        var ratingModel = new ContractorRatingModelVersion
        {
            VersionCode = "R-AN-001",
            Name = "Analytics rating model",
            IsActive = true,
            ActivatedAtUtc = now
        };
        ratingModel.Weights.Add(new ContractorRatingWeight
        {
            FactorCode = ContractorRatingFactorCode.DeliveryDiscipline,
            Weight = 1m
        });

        var ratingHistory = new ContractorRatingHistoryEntry
        {
            ContractorId = contractorA.Id,
            ModelVersion = ratingModel,
            SourceType = ContractorRatingRecordSourceType.AutoRecalculation,
            CalculatedAtUtc = now,
            DeliveryDisciplineScore = 90m,
            CommercialDisciplineScore = 80m,
            ClaimDisciplineScore = 80m,
            ManualExpertScore = 85m,
            WorkloadPenaltyScore = 90m,
            FinalScore = 87m
        };

        var warningViolation = new SlaViolation
        {
            EntityType = SlaViolationEntityType.ProcedureProposalDueDate,
            EntityId = Guid.NewGuid(),
            DueDate = now.UtcDateTime.Date.AddDays(1),
            Severity = SlaViolationSeverity.Warning,
            Title = "Warning violation",
            IsResolved = false,
            FirstDetectedAtUtc = now.UtcDateTime,
            LastDetectedAtUtc = now.UtcDateTime
        };
        var overdueViolation = new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractEndDate,
            EntityId = Guid.NewGuid(),
            DueDate = now.UtcDateTime.Date.AddDays(-1),
            Severity = SlaViolationSeverity.Overdue,
            Title = "Overdue violation",
            IsResolved = false,
            FirstDetectedAtUtc = now.UtcDateTime,
            LastDetectedAtUtc = now.UtcDateTime
        };
        var resolvedViolation = new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractMilestone,
            EntityId = Guid.NewGuid(),
            DueDate = now.UtcDateTime.Date.AddDays(-5),
            Severity = SlaViolationSeverity.Overdue,
            Title = "Resolved violation",
            IsResolved = true,
            ResolvedAtUtc = now.UtcDateTime.AddDays(-10),
            FirstDetectedAtUtc = now.UtcDateTime.AddDays(-15),
            LastDetectedAtUtc = now.UtcDateTime.AddDays(-10)
        };

        await db.Set<Contractor>().AddRangeAsync(contractorA, contractorB);
        await db.Set<Lot>().AddRangeAsync(lotDraft, lotInProcurement, lotContracted);
        await db.Set<Contract>().AddRangeAsync(signedContract, closedContract);
        await db.Set<ContractMdrCard>().AddAsync(mdrCard);
        await db.Set<ContractorRatingModelVersion>().AddAsync(ratingModel);
        await db.Set<ContractorRatingHistoryEntry>().AddAsync(ratingHistory);
        await db.Set<SlaViolation>().AddRangeAsync(warningViolation, overdueViolation, resolvedViolation);
        await db.SaveChangesAsync();
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
