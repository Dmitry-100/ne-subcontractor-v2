using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Contracts;

[Trait("SqlSuite", "Core")]
public sealed class ContractsSqlExecutionPlanningTests
{
    [SqlFact]
    public async Task UpsertMilestonesAsync_WhenReplacingExistingData_ShouldPersistOnlyNewMilestones()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMilestone>().AddAsync(new ContractMilestone
        {
            ContractId = contract.Id,
            Title = "Legacy milestone",
            PlannedDate = DateTime.UtcNow.Date.AddDays(-4),
            ProgressPercent = 10m,
            SortOrder = 0
        });
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var milestones = await service.UpsertMilestonesAsync(
            contract.Id,
            new UpdateContractMilestonesRequest
            {
                Items =
                [
                    new UpsertContractMilestoneItemRequest
                    {
                        Title = "Kickoff",
                        PlannedDate = DateTime.UtcNow.Date.AddDays(-2),
                        ProgressPercent = 40m,
                        SortOrder = 0
                    },
                    new UpsertContractMilestoneItemRequest
                    {
                        Title = "Documentation",
                        PlannedDate = DateTime.UtcNow.Date.AddDays(5),
                        ActualDate = DateTime.UtcNow.Date,
                        ProgressPercent = 100m,
                        SortOrder = 1
                    }
                ]
            });

        Assert.Equal(2, milestones.Count);
        Assert.Single(milestones.Where(x => x.IsOverdue));
        Assert.DoesNotContain(milestones, x => x.Title == "Legacy milestone");

        var persisted = await db.Set<ContractMilestone>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .OrderBy(x => x.SortOrder)
            .ToListAsync();

        Assert.Equal(2, persisted.Count);
        Assert.Equal("Kickoff", persisted[0].Title);
        Assert.Equal("Documentation", persisted[1].Title);
    }

    [SqlFact]
    public async Task UpsertMonitoringControlPointsAsync_WithInvalidStageProgress_ShouldThrow_AndKeepExistingData()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(ContractStatus.Active);

        var existingPoint = new ContractMonitoringControlPoint
        {
            ContractId = contract.Id,
            Name = "Legacy control point",
            PlannedDate = DateTime.UtcNow.Date.AddDays(2),
            ProgressPercent = 50m,
            SortOrder = 0
        };
        existingPoint.Stages.Add(new ContractMonitoringControlPointStage
        {
            Name = "Legacy stage",
            PlannedDate = DateTime.UtcNow.Date.AddDays(2),
            ProgressPercent = 50m,
            SortOrder = 0
        });

        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMonitoringControlPoint>().AddAsync(existingPoint);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertMonitoringControlPointsAsync(
            contract.Id,
            new UpdateContractMonitoringControlPointsRequest
            {
                Items =
                [
                    new UpsertContractMonitoringControlPointItemRequest
                    {
                        Name = "New point",
                        PlannedDate = DateTime.UtcNow.Date,
                        ProgressPercent = 40m,
                        SortOrder = 0,
                        Stages =
                        [
                            new UpsertContractMonitoringControlPointStageItemRequest
                            {
                                Name = "Invalid stage",
                                PlannedDate = DateTime.UtcNow.Date,
                                ProgressPercent = 120m,
                                SortOrder = 0
                            }
                        ]
                    }
                ]
            }));

        Assert.Equal("Control point #1 stage #1: progress must be in range 0..100.", error.Message);

        var points = await db.Set<ContractMonitoringControlPoint>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();
        var stages = await db.Set<ContractMonitoringControlPointStage>()
            .AsNoTracking()
            .ToListAsync();

        Assert.Single(points);
        Assert.Equal("Legacy control point", points[0].Name);
        Assert.Single(stages);
        Assert.Equal("Legacy stage", stages[0].Name);
    }

    [SqlFact]
    public async Task UpsertMonitoringControlPointsAsync_WhenReplacingExistingData_ShouldReturnOnlyActiveRows()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(ContractStatus.Active);

        var legacyPoint = new ContractMonitoringControlPoint
        {
            ContractId = contract.Id,
            Name = "Legacy point",
            PlannedDate = DateTime.UtcNow.Date.AddDays(-1),
            ProgressPercent = 10m,
            SortOrder = 0
        };
        legacyPoint.Stages.Add(new ContractMonitoringControlPointStage
        {
            Name = "Legacy stage",
            PlannedDate = DateTime.UtcNow.Date.AddDays(-1),
            ProgressPercent = 10m,
            SortOrder = 0
        });

        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMonitoringControlPoint>().AddAsync(legacyPoint);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var result = await service.UpsertMonitoringControlPointsAsync(
            contract.Id,
            new UpdateContractMonitoringControlPointsRequest
            {
                Items =
                [
                    new UpsertContractMonitoringControlPointItemRequest
                    {
                        Name = "Current point",
                        ResponsibleRole = "PM",
                        PlannedDate = DateTime.UtcNow.Date.AddDays(3),
                        ProgressPercent = 70m,
                        SortOrder = 0,
                        Stages =
                        [
                            new UpsertContractMonitoringControlPointStageItemRequest
                            {
                                Name = "Current stage",
                                PlannedDate = DateTime.UtcNow.Date.AddDays(3),
                                ProgressPercent = 70m,
                                SortOrder = 0
                            }
                        ]
                    }
                ]
            });

        var dtoPoint = Assert.Single(result);
        Assert.Equal("Current point", dtoPoint.Name);
        Assert.Single(dtoPoint.Stages);
        Assert.Equal("Current stage", dtoPoint.Stages[0].Name);

        var persistedPoints = await db.Set<ContractMonitoringControlPoint>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();
        var persistedStages = await db.Set<ContractMonitoringControlPointStage>()
            .AsNoTracking()
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();

        Assert.Single(persistedPoints);
        Assert.Single(persistedStages);
        Assert.Equal("Current point", persistedPoints[0].Name);
        Assert.Equal("Current stage", persistedStages[0].Name);
    }

    [SqlFact]
    public async Task UpsertMdrCardsAsync_WhenReplacingExistingData_ShouldReturnOnlyActiveRows()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(ContractStatus.Active);

        var legacyCard = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "Legacy MDR",
            ReportingDate = DateTime.UtcNow.Date.AddDays(-5),
            SortOrder = 0
        };
        legacyCard.Rows.Add(new ContractMdrRow
        {
            RowCode = "LEG-001",
            Description = "Legacy row",
            UnitCode = "MH",
            PlanValue = 50m,
            ForecastValue = 40m,
            FactValue = 30m,
            SortOrder = 0
        });

        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMdrCard>().AddAsync(legacyCard);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var result = await service.UpsertMdrCardsAsync(
            contract.Id,
            new UpdateContractMdrCardsRequest
            {
                Items =
                [
                    new UpsertContractMdrCardItemRequest
                    {
                        Title = "Current MDR",
                        ReportingDate = DateTime.UtcNow.Date,
                        SortOrder = 0,
                        Rows =
                        [
                            new UpsertContractMdrRowItemRequest
                            {
                                RowCode = "CUR-001",
                                Description = "Current row",
                                UnitCode = "MH",
                                PlanValue = 100m,
                                ForecastValue = 105m,
                                FactValue = 95m,
                                SortOrder = 0
                            }
                        ]
                    }
                ]
            });

        var dtoCard = Assert.Single(result);
        Assert.Equal("Current MDR", dtoCard.Title);
        var dtoRow = Assert.Single(dtoCard.Rows);
        Assert.Equal("CUR-001", dtoRow.RowCode);

        var persistedCards = await db.Set<ContractMdrCard>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();
        var persistedRows = await db.Set<ContractMdrRow>()
            .AsNoTracking()
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();

        Assert.Single(persistedCards);
        Assert.Single(persistedRows);
        Assert.Equal("Current MDR", persistedCards[0].Title);
        Assert.Equal("CUR-001", persistedRows[0].RowCode);
    }

    [SqlFact]
    public async Task ImportMdrForecastFactAsync_WithAmbiguousTargetInStrictMode_ShouldPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);

        var reportingDate = DateTime.UtcNow.Date;
        var firstCard = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "MDR-Апрель",
            ReportingDate = reportingDate,
            SortOrder = 0
        };
        firstCard.Rows.Add(new ContractMdrRow
        {
            RowCode = "MDR-001",
            Description = "First",
            UnitCode = "MH",
            PlanValue = 100m,
            ForecastValue = 110m,
            FactValue = 90m,
            SortOrder = 0
        });

        var secondCard = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "MDR-Апрель",
            ReportingDate = reportingDate,
            SortOrder = 1
        };
        secondCard.Rows.Add(new ContractMdrRow
        {
            RowCode = "MDR-001",
            Description = "Second",
            UnitCode = "MH",
            PlanValue = 120m,
            ForecastValue = 130m,
            FactValue = 110m,
            SortOrder = 0
        });

        await db.Set<ContractMdrCard>().AddRangeAsync(firstCard, secondCard);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var result = await service.ImportMdrForecastFactAsync(
            contract.Id,
            new ImportContractMdrForecastFactRequest
            {
                SkipConflicts = false,
                Items =
                [
                    new ImportContractMdrForecastFactItemRequest
                    {
                        SourceRowNumber = 4,
                        CardTitle = "MDR-Апрель",
                        ReportingDate = reportingDate,
                        RowCode = "mdr-001",
                        ForecastValue = 200m,
                        FactValue = 180m
                    }
                ]
            });

        Assert.False(result.Applied);
        Assert.Equal(0, result.UpdatedRows);
        Assert.Equal(1, result.ConflictRows);
        Assert.Contains(result.Conflicts, x => x.Code == "AMBIGUOUS_TARGET" && x.SourceRowNumber == 4);

        var persistedRows = await db.Set<ContractMdrRow>()
            .AsNoTracking()
            .OrderBy(x => x.Description)
            .ToListAsync();

        Assert.Equal(2, persistedRows.Count);
        Assert.Equal(110m, persistedRows[0].ForecastValue);
        Assert.Equal(130m, persistedRows[1].ForecastValue);
    }

    [SqlFact]
    public async Task ImportMdrForecastFactAsync_SkipConflictsMode_ShouldUpdateMatchedRows()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);

        var card = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "MDR-Май",
            ReportingDate = DateTime.UtcNow.Date,
            SortOrder = 0
        };
        card.Rows.Add(new ContractMdrRow
        {
            RowCode = "MDR-010",
            Description = "Matched row",
            UnitCode = "MH",
            PlanValue = 150m,
            ForecastValue = 155m,
            FactValue = 140m,
            SortOrder = 0
        });

        await db.Set<ContractMdrCard>().AddAsync(card);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var result = await service.ImportMdrForecastFactAsync(
            contract.Id,
            new ImportContractMdrForecastFactRequest
            {
                SkipConflicts = true,
                Items =
                [
                    new ImportContractMdrForecastFactItemRequest
                    {
                        SourceRowNumber = 2,
                        CardTitle = "MDR-Май",
                        ReportingDate = DateTime.UtcNow.Date,
                        RowCode = "MDR-010",
                        ForecastValue = 180m,
                        FactValue = 150m
                    },
                    new ImportContractMdrForecastFactItemRequest
                    {
                        SourceRowNumber = 3,
                        CardTitle = "MDR-Май",
                        ReportingDate = DateTime.UtcNow.Date,
                        RowCode = "MDR-NOT-FOUND",
                        ForecastValue = 5m,
                        FactValue = 4m
                    }
                ]
            });

        Assert.True(result.Applied);
        Assert.Equal(2, result.TotalRows);
        Assert.Equal(1, result.UpdatedRows);
        Assert.Equal(1, result.ConflictRows);
        Assert.Contains(result.Conflicts, x => x.Code == "TARGET_NOT_FOUND" && x.SourceRowNumber == 3);

        var persistedRow = await db.Set<ContractMdrRow>()
            .AsNoTracking()
            .SingleAsync(x => x.RowCode == "MDR-010");
        Assert.Equal(180m, persistedRow.ForecastValue);
        Assert.Equal(150m, persistedRow.FactValue);
    }

    private static Contract CreateContract(ContractStatus status)
    {
        var startDate = DateTime.UtcNow.Date.AddDays(-7);
        return new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = $"CTR-SQL-EX-{Guid.NewGuid():N}"[..24],
            SigningDate = startDate.AddDays(-1),
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = startDate,
            EndDate = startDate.AddDays(30),
            Status = status
        };
    }
}
