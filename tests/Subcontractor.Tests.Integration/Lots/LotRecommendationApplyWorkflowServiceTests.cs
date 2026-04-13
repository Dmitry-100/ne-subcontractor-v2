using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotRecommendationApplyWorkflowServiceTests
{
    [Fact]
    public async Task ApplyAsync_ReadyForLotting_ShouldCreateDraftLotsAndTraceRecords()
    {
        await using var db = TestDbContextFactory.Create();
        var batchId = await SeedReadyBatchAsync(db);
        var batch = await LoadBatchAsync(db, batchId);
        var groupingService = new LotRecommendationGroupingService(db);
        var applyWorkflowService = new LotRecommendationApplyWorkflowService(db);
        var groups = await groupingService.BuildGroupsAsync(batch);
        var targetGroup = Assert.Single(groups.Where(x => string.Equals(x.DisciplineCode, "PIPING", StringComparison.OrdinalIgnoreCase)));

        var result = await applyWorkflowService.ApplyAsync(batch, groups, new ApplyLotRecommendationsRequest
        {
            Groups =
            [
                new ApplyLotRecommendationGroupRequest
                {
                    GroupKey = targetGroup.GroupKey
                }
            ]
        });

        Assert.Equal(1, result.RequestedGroups);
        var created = Assert.Single(result.CreatedLots);
        Assert.Equal(targetGroup.GroupKey, created.GroupKey);
        Assert.Equal(2, created.ItemsCount);
        Assert.Empty(result.SkippedGroups);

        var trace = await db.Set<SourceDataLotReconciliationRecord>()
            .Where(x => x.SourceDataImportBatchId == batchId)
            .ToListAsync();
        var traceRecord = Assert.Single(trace);
        Assert.True(traceRecord.IsCreated);
        Assert.Equal(created.LotId, traceRecord.LotId);
        Assert.Null(traceRecord.SkipReason);
    }

    [Fact]
    public async Task ApplyAsync_NotReadyForLotting_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "PRJ-001",
            Name = "Pilot project"
        });
        await db.SaveChangesAsync();

        var sourceDataImportsService = new SourceDataImportsService(db);
        var batch = await sourceDataImportsService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "validated-only.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                }
            ]
        });

        var loadedBatch = await LoadBatchAsync(db, batch.Id);
        var groupingService = new LotRecommendationGroupingService(db);
        var applyWorkflowService = new LotRecommendationApplyWorkflowService(db);
        var groups = await groupingService.BuildGroupsAsync(loadedBatch);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            applyWorkflowService.ApplyAsync(loadedBatch, groups, new ApplyLotRecommendationsRequest()));

        Assert.Contains("ReadyForLotting", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<SourceDataImportBatch> LoadBatchAsync(Infrastructure.Persistence.AppDbContext db, Guid batchId)
    {
        var batch = await db.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == batchId);
        Assert.NotNull(batch);

        return batch!;
    }

    private static async Task<Guid> SeedReadyBatchAsync(Infrastructure.Persistence.AppDbContext db)
    {
        await db.Set<Project>().AddRangeAsync(
            new Project
            {
                Code = "PRJ-001",
                Name = "Pilot project 1"
            },
            new Project
            {
                Code = "PRJ-002",
                Name = "Pilot project 2"
            });
        await db.SaveChangesAsync();

        var sourceDataImportsService = new SourceDataImportsService(db);
        var batch = await sourceDataImportsService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "lot-reco.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.02",
                    DisciplineCode = "PIPING",
                    ManHours = 20m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 3,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.03",
                    DisciplineCode = "ELEC",
                    ManHours = 5m
                }
            ]
        });

        var transitioned = await sourceDataImportsService.TransitionBatchStatusAsync(batch.Id, new SourceDataImportBatchStatusTransitionRequest
        {
            TargetStatus = SourceDataImportBatchStatus.ReadyForLotting
        });
        Assert.NotNull(transitioned);

        return batch.Id;
    }
}
