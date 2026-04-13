using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Sla;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Analytics;

[Trait("SqlSuite", "Core")]
public sealed class AnalyticsSqlServiceTests
{
    [SqlFact]
    public async Task GetKpiDashboardAsync_WithEmptyDatabase_ShouldReturnZeroMetrics()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("analytics-user");
        await using var db = database.CreateDbContext("analytics-user");
        var now = new DateTimeOffset(2026, 12, 20, 9, 0, 0, TimeSpan.Zero);

        var service = new AnalyticsService(db, new FixedDateTimeProvider(now));
        var result = await service.GetKpiDashboardAsync();

        Assert.Equal(0, result.LotFunnel.Sum(x => x.Count));
        Assert.Equal(0, result.ContractorLoad.ActiveContractors);
        Assert.Equal(0, result.ContractorLoad.OverloadedContractors);
        Assert.Equal(0, result.ContractorLoad.HighRatingContractors);
        Assert.Null(result.ContractorLoad.AverageLoadPercent);
        Assert.Null(result.ContractorLoad.AverageRating);
        Assert.Equal(0, result.Sla.OpenWarnings);
        Assert.Equal(0, result.Sla.OpenOverdue);
        Assert.Equal(0, result.Sla.ResolvedLast30Days);
        Assert.Equal(0m, result.ContractingAmounts.SignedAndActiveTotalAmount);
        Assert.Equal(0m, result.ContractingAmounts.ClosedTotalAmount);
        Assert.Null(result.ContractingAmounts.AverageContractAmount);
        Assert.Equal(0, result.MdrProgress.CardsTotal);
        Assert.Equal(0, result.MdrProgress.RowsTotal);
        Assert.Equal(0, result.MdrProgress.RowsWithFact);
        Assert.Null(result.MdrProgress.FactCoveragePercent);
        Assert.Equal(0m, result.SubcontractingShare.TotalPlannedManHours);
        Assert.Equal(0m, result.SubcontractingShare.ContractedManHours);
        Assert.Null(result.SubcontractingShare.SharePercent);
        Assert.Empty(result.TopContractors);
    }

    [SqlFact]
    public async Task GetKpiDashboardAsync_ShouldReturnCalculatedMetrics()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("analytics-user");
        await using var db = database.CreateDbContext("analytics-user");
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

    [SqlFact]
    public async Task GetKpiDashboardAsync_TopContractors_ShouldUseRatingThenLoadOrdering_AndLatestHistoryTimestamp()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("analytics-user");
        await using var db = database.CreateDbContext("analytics-user");
        var now = new DateTimeOffset(2026, 12, 20, 9, 0, 0, TimeSpan.Zero);

        var contractorA = new Contractor
        {
            Inn = "7711000101",
            Name = "Top A",
            City = "Moscow",
            ContactName = "A",
            Phone = "+70000000101",
            Email = "top-a@test.local",
            CapacityHours = 160m,
            CurrentRating = 4.9m,
            CurrentLoadPercent = 80m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
        var contractorB = new Contractor
        {
            Inn = "7711000102",
            Name = "Top B",
            City = "Moscow",
            ContactName = "B",
            Phone = "+70000000102",
            Email = "top-b@test.local",
            CapacityHours = 160m,
            CurrentRating = 4.9m,
            CurrentLoadPercent = 40m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
        var contractorC = new Contractor
        {
            Inn = "7711000103",
            Name = "Top C",
            City = "Moscow",
            ContactName = "C",
            Phone = "+70000000103",
            Email = "top-c@test.local",
            CapacityHours = 160m,
            CurrentRating = 4.8m,
            CurrentLoadPercent = 10m,
            ReliabilityClass = ReliabilityClass.B,
            Status = ContractorStatus.Active
        };

        var model = new ContractorRatingModelVersion
        {
            VersionCode = "R-TOP-001",
            Name = "Top contractors model",
            IsActive = true,
            ActivatedAtUtc = now
        };
        model.Weights.Add(new ContractorRatingWeight
        {
            FactorCode = ContractorRatingFactorCode.DeliveryDiscipline,
            Weight = 1m
        });

        await db.Set<Contractor>().AddRangeAsync(contractorA, contractorB, contractorC);
        await db.Set<ContractorRatingModelVersion>().AddAsync(model);
        await db.Set<ContractorRatingHistoryEntry>().AddRangeAsync(
            new ContractorRatingHistoryEntry
            {
                ContractorId = contractorA.Id,
                ModelVersion = model,
                SourceType = ContractorRatingRecordSourceType.AutoRecalculation,
                CalculatedAtUtc = now.AddDays(-5),
                DeliveryDisciplineScore = 80m,
                CommercialDisciplineScore = 80m,
                ClaimDisciplineScore = 80m,
                ManualExpertScore = 80m,
                WorkloadPenaltyScore = 80m,
                FinalScore = 80m
            },
            new ContractorRatingHistoryEntry
            {
                ContractorId = contractorA.Id,
                ModelVersion = model,
                SourceType = ContractorRatingRecordSourceType.AutoRecalculation,
                CalculatedAtUtc = now.AddDays(-1),
                DeliveryDisciplineScore = 90m,
                CommercialDisciplineScore = 90m,
                ClaimDisciplineScore = 90m,
                ManualExpertScore = 90m,
                WorkloadPenaltyScore = 90m,
                FinalScore = 90m
            },
            new ContractorRatingHistoryEntry
            {
                ContractorId = contractorB.Id,
                ModelVersion = model,
                SourceType = ContractorRatingRecordSourceType.AutoRecalculation,
                CalculatedAtUtc = now.AddDays(-2),
                DeliveryDisciplineScore = 85m,
                CommercialDisciplineScore = 85m,
                ClaimDisciplineScore = 85m,
                ManualExpertScore = 85m,
                WorkloadPenaltyScore = 85m,
                FinalScore = 85m
            });
        await db.SaveChangesAsync();

        var service = new AnalyticsService(db, new FixedDateTimeProvider(now));
        var result = await service.GetKpiDashboardAsync();

        Assert.Equal(3, result.TopContractors.Count);
        Assert.Equal(contractorB.Id, result.TopContractors[0].ContractorId);
        Assert.Equal(contractorA.Id, result.TopContractors[1].ContractorId);
        Assert.Equal(contractorC.Id, result.TopContractors[2].ContractorId);
        Assert.Equal(now.AddDays(-1), result.TopContractors[1].LastRatingCalculatedAtUtc);
        Assert.Equal(now.AddDays(-2), result.TopContractors[0].LastRatingCalculatedAtUtc);
        Assert.Null(result.TopContractors[2].LastRatingCalculatedAtUtc);
    }

    private static async Task SeedAnalyticsDataAsync(Subcontractor.Infrastructure.Persistence.AppDbContext db, DateTimeOffset now)
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
