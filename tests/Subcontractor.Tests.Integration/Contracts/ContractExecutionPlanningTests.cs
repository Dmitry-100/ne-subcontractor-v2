using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contracts;

public sealed class ContractExecutionPlanningTests
{
    [Fact]
    public async Task UpsertMilestonesAsync_SignedContract_ShouldPersistMilestonesAndMarkOverdue()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Signed);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var plannedDate = DateTime.UtcNow.Date;
        var milestones = await service.UpsertMilestonesAsync(contract.Id, new UpdateContractMilestonesRequest
        {
            Items =
            [
                new UpsertContractMilestoneItemRequest
                {
                    Title = "Kickoff",
                    PlannedDate = plannedDate.AddDays(-2),
                    ActualDate = null,
                    ProgressPercent = 25m,
                    SortOrder = 0,
                    Notes = "Delayed by input data"
                },
                new UpsertContractMilestoneItemRequest
                {
                    Title = "Documentation package",
                    PlannedDate = plannedDate.AddDays(3),
                    ActualDate = plannedDate,
                    ProgressPercent = 100m,
                    SortOrder = 1,
                    Notes = null
                }
            ]
        });

        Assert.Equal(2, milestones.Count);
        Assert.Equal(1, milestones.Count(x => x.IsOverdue));

        var persisted = await db.Set<ContractMilestone>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();

        Assert.Equal(2, persisted.Count);
    }

    [Fact]
    public async Task UpsertMilestonesAsync_DraftContract_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Draft, includeSigningDate: false);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertMilestonesAsync(
            contract.Id,
            new UpdateContractMilestonesRequest
            {
                Items =
                [
                    new UpsertContractMilestoneItemRequest
                    {
                        Title = "Should fail",
                        PlannedDate = DateTime.UtcNow.Date,
                        ProgressPercent = 10m,
                        SortOrder = 0
                    }
                ]
            }));

        Assert.Equal("Milestones can be edited only for Signed or Active contracts.", error.Message);
    }

    [Fact]
    public async Task UpsertMilestonesAsync_InvalidProgress_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertMilestonesAsync(
            contract.Id,
            new UpdateContractMilestonesRequest
            {
                Items =
                [
                    new UpsertContractMilestoneItemRequest
                    {
                        Title = "Invalid progress",
                        PlannedDate = DateTime.UtcNow.Date,
                        ProgressPercent = 120m,
                        SortOrder = 0
                    }
                ]
            }));

        Assert.Equal("Milestone #1: progress must be in range 0..100.", error.Message);
    }

    [Fact]
    public async Task GetExecutionSummaryAsync_ShouldCalculateProgressAndOverdue()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMilestone>().AddRangeAsync(
            new ContractMilestone
            {
                ContractId = contract.Id,
                Title = "Completed",
                PlannedDate = DateTime.UtcNow.Date.AddDays(-5),
                ActualDate = DateTime.UtcNow.Date.AddDays(-4),
                ProgressPercent = 100m,
                SortOrder = 0
            },
            new ContractMilestone
            {
                ContractId = contract.Id,
                Title = "In progress overdue",
                PlannedDate = DateTime.UtcNow.Date.AddDays(-1),
                ProgressPercent = 50m,
                SortOrder = 1
            },
            new ContractMilestone
            {
                ContractId = contract.Id,
                Title = "Upcoming",
                PlannedDate = DateTime.UtcNow.Date.AddDays(4),
                ProgressPercent = 0m,
                SortOrder = 2
            });
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var summary = await service.GetExecutionSummaryAsync(contract.Id);

        Assert.Equal(3, summary.MilestonesTotal);
        Assert.Equal(1, summary.MilestonesCompleted);
        Assert.Equal(1, summary.OverdueMilestones);
        Assert.Equal(50m, summary.ProgressPercent);
        Assert.NotNull(summary.NextPlannedDate);
    }

    [Fact]
    public async Task TransitionAsync_CloseWithOverdueMilestones_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMilestone>().AddAsync(new ContractMilestone
        {
            ContractId = contract.Id,
            Title = "Overdue item",
            PlannedDate = DateTime.UtcNow.Date.AddDays(-3),
            ProgressPercent = 40m,
            SortOrder = 0
        });
        await db.SaveChangesAsync();

        var service = new ContractsService(db);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransitionAsync(
            contract.Id,
            new ContractStatusTransitionRequest
            {
                TargetStatus = ContractStatus.Closed,
                Reason = null
            }));

        Assert.Equal("Contract has overdue milestones. Resolve overdue items before closing.", error.Message);
    }

    [Fact]
    public async Task UpsertMonitoringControlPointsAsync_ActiveContract_ShouldPersistControlPointsAndStages()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var today = DateTime.UtcNow.Date;
        var service = new ContractsService(db);
        var controlPoints = await service.UpsertMonitoringControlPointsAsync(contract.Id, new UpdateContractMonitoringControlPointsRequest
        {
            Items =
            [
                new UpsertContractMonitoringControlPointItemRequest
                {
                    Name = "КП-01. Документация",
                    ResponsibleRole = "PM",
                    PlannedDate = today.AddDays(-3),
                    ForecastDate = today.AddDays(-1),
                    ProgressPercent = 60m,
                    SortOrder = 0,
                    Stages =
                    [
                        new UpsertContractMonitoringControlPointStageItemRequest
                        {
                            Name = "Стадия P",
                            PlannedDate = today.AddDays(-4),
                            ForecastDate = today.AddDays(-2),
                            ProgressPercent = 80m,
                            SortOrder = 0
                        },
                        new UpsertContractMonitoringControlPointStageItemRequest
                        {
                            Name = "Стадия R",
                            PlannedDate = today.AddDays(5),
                            ForecastDate = today.AddDays(8),
                            ProgressPercent = 0m,
                            SortOrder = 1
                        }
                    ]
                }
            ]
        });

        var point = Assert.Single(controlPoints);
        Assert.Equal("КП-01. Документация", point.Name);
        Assert.True(point.IsDelayed);
        Assert.Equal(2, point.Stages.Count);
        Assert.Contains(point.Stages, x => x.IsDelayed);

        var persistedPoints = await db.Set<ContractMonitoringControlPoint>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();
        var persistedStages = await db.Set<ContractMonitoringControlPointStage>()
            .AsNoTracking()
            .ToListAsync();

        Assert.Single(persistedPoints);
        Assert.Equal(2, persistedStages.Count);
    }

    [Fact]
    public async Task UpsertMdrCardsAsync_ActiveContract_ShouldCalculateDeviations()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var cards = await service.UpsertMdrCardsAsync(contract.Id, new UpdateContractMdrCardsRequest
        {
            Items =
            [
                new UpsertContractMdrCardItemRequest
                {
                    Title = "MDR-Апрель",
                    ReportingDate = DateTime.UtcNow.Date,
                    SortOrder = 0,
                    Rows =
                    [
                        new UpsertContractMdrRowItemRequest
                        {
                            RowCode = "MDR-001",
                            Description = "Разработка КМ",
                            UnitCode = "MH",
                            PlanValue = 100m,
                            ForecastValue = 120m,
                            FactValue = 90m,
                            SortOrder = 0
                        }
                    ]
                }
            ]
        });

        var card = Assert.Single(cards);
        var row = Assert.Single(card.Rows);
        Assert.Equal(20m, row.ForecastDeviationPercent);
        Assert.Equal(-10m, row.FactDeviationPercent);
        Assert.Equal(20m, card.ForecastDeviationPercent);
        Assert.Equal(-10m, card.FactDeviationPercent);

        var persistedCards = await db.Set<ContractMdrCard>()
            .AsNoTracking()
            .Where(x => x.ContractId == contract.Id)
            .ToListAsync();
        var persistedRows = await db.Set<ContractMdrRow>()
            .AsNoTracking()
            .ToListAsync();

        Assert.Single(persistedCards);
        Assert.Single(persistedRows);
    }

    [Fact]
    public async Task ImportMdrForecastFactAsync_StrictModeWithConflicts_ShouldNotPersistAnyUpdates()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);

        var card = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "MDR-Апрель",
            ReportingDate = DateTime.UtcNow.Date,
            SortOrder = 0
        };
        card.Rows.Add(new ContractMdrRow
        {
            RowCode = "MDR-001",
            Description = "Разработка КМ",
            UnitCode = "MH",
            PlanValue = 100m,
            ForecastValue = 110m,
            FactValue = 90m,
            SortOrder = 0
        });
        await db.Set<ContractMdrCard>().AddAsync(card);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var result = await service.ImportMdrForecastFactAsync(contract.Id, new ImportContractMdrForecastFactRequest
        {
            SkipConflicts = false,
            Items =
            [
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 2,
                    CardTitle = "MDR-Апрель",
                    ReportingDate = DateTime.UtcNow.Date,
                    RowCode = "MDR-001",
                    ForecastValue = 130m,
                    FactValue = 100m
                },
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 3,
                    CardTitle = "MDR-Апрель",
                    ReportingDate = DateTime.UtcNow.Date,
                    RowCode = "MDR-UNKNOWN",
                    ForecastValue = 20m,
                    FactValue = 10m
                }
            ]
        });

        Assert.False(result.Applied);
        Assert.Equal(2, result.TotalRows);
        Assert.Equal(0, result.UpdatedRows);
        Assert.Equal(1, result.ConflictRows);
        Assert.Contains(result.Conflicts, x => x.Code == "TARGET_NOT_FOUND" && x.SourceRowNumber == 3);

        var persistedRow = await db.Set<ContractMdrRow>()
            .AsNoTracking()
            .SingleAsync(x => x.RowCode == "MDR-001");
        Assert.Equal(110m, persistedRow.ForecastValue);
        Assert.Equal(90m, persistedRow.FactValue);
    }

    [Fact]
    public async Task ImportMdrForecastFactAsync_SkipConflictsMode_ShouldPersistMatchedUpdates()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active);
        await db.Set<Contract>().AddAsync(contract);

        var card = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "MDR-Апрель",
            ReportingDate = DateTime.UtcNow.Date,
            SortOrder = 0
        };
        card.Rows.Add(new ContractMdrRow
        {
            RowCode = "MDR-001",
            Description = "Разработка КМ",
            UnitCode = "MH",
            PlanValue = 100m,
            ForecastValue = 110m,
            FactValue = 90m,
            SortOrder = 0
        });
        await db.Set<ContractMdrCard>().AddAsync(card);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var result = await service.ImportMdrForecastFactAsync(contract.Id, new ImportContractMdrForecastFactRequest
        {
            SkipConflicts = true,
            Items =
            [
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 2,
                    CardTitle = "MDR-Апрель",
                    ReportingDate = DateTime.UtcNow.Date,
                    RowCode = "MDR-001",
                    ForecastValue = 130m,
                    FactValue = 100m
                },
                new ImportContractMdrForecastFactItemRequest
                {
                    SourceRowNumber = 3,
                    CardTitle = "MDR-Апрель",
                    ReportingDate = DateTime.UtcNow.Date,
                    RowCode = "MDR-UNKNOWN",
                    ForecastValue = 20m,
                    FactValue = 10m
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
            .SingleAsync(x => x.RowCode == "MDR-001");
        Assert.Equal(130m, persistedRow.ForecastValue);
        Assert.Equal(100m, persistedRow.FactValue);
    }

    [Fact]
    public async Task UpsertMonitoringControlPointsAsync_DraftContract_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Draft, includeSigningDate: false);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var service = new ContractsService(db);
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertMonitoringControlPointsAsync(
            contract.Id,
            new UpdateContractMonitoringControlPointsRequest
            {
                Items =
                [
                    new UpsertContractMonitoringControlPointItemRequest
                    {
                        Name = "КП draft",
                        PlannedDate = DateTime.UtcNow.Date,
                        ProgressPercent = 0m,
                        SortOrder = 0
                    }
                ]
            }));

        Assert.Equal("Monitoring control points can be edited only for Signed or Active contracts.", error.Message);
    }

    private static Contract CreateContract(ContractStatus status, bool includeSigningDate = true)
    {
        var startDate = DateTime.UtcNow.Date.AddDays(-10);
        return new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = $"CTR-{Guid.NewGuid():N}".Substring(0, 18),
            SigningDate = includeSigningDate ? startDate.AddDays(-2) : null,
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = startDate,
            EndDate = startDate.AddDays(20),
            Status = status
        };
    }
}
