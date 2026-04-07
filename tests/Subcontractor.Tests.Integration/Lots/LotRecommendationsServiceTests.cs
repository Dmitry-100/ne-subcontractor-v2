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

public sealed class LotRecommendationsServiceTests
{
    [Fact]
    public async Task BuildFromImportBatchAsync_ReadyForLotting_ShouldReturnRecommendationGroups()
    {
        await using var db = TestDbContextFactory.Create();
        var batchId = await SeedReadyBatchAsync(db);
        var recommendationsService = new LotRecommendationsService(db);

        var result = await recommendationsService.BuildFromImportBatchAsync(batchId);

        Assert.NotNull(result);
        Assert.Equal(SourceDataImportBatchStatus.ReadyForLotting, result!.BatchStatus);
        Assert.True(result.CanApply);
        Assert.Equal(3, result.CandidateRows);
        Assert.Equal(2, result.Groups.Count);
        Assert.Contains(result.Groups, x => x.ProjectCode == "PRJ-001" && x.DisciplineCode == "PIPING");
        Assert.Contains(result.Groups, x => x.ProjectCode == "PRJ-001" && x.DisciplineCode == "ELEC");
    }

    [Fact]
    public async Task ApplyFromImportBatchAsync_NotReadyForLotting_ShouldThrowInvalidOperationException()
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

        var recommendationsService = new LotRecommendationsService(db);
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => recommendationsService.ApplyFromImportBatchAsync(
            batch.Id,
            new ApplyLotRecommendationsRequest()));

        Assert.Contains("ReadyForLotting", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ApplyFromImportBatchAsync_ReadyForLotting_ShouldCreateDraftLots()
    {
        await using var db = TestDbContextFactory.Create();
        var batchId = await SeedReadyBatchAsync(db);
        var recommendationsService = new LotRecommendationsService(db);
        var recommendations = await recommendationsService.BuildFromImportBatchAsync(batchId);
        Assert.NotNull(recommendations);

        var targetGroup = Assert.Single(recommendations!.Groups.Where(x => x.DisciplineCode == "PIPING"));
        var result = await recommendationsService.ApplyFromImportBatchAsync(batchId, new ApplyLotRecommendationsRequest
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

        var lot = await db.Set<Lot>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == created.LotId);
        Assert.NotNull(lot);
        Assert.Equal(LotStatus.Draft, lot!.Status);
        Assert.Equal(2, lot.Items.Count);

        var history = await db.Set<LotStatusHistory>()
            .Where(x => x.LotId == created.LotId)
            .ToListAsync();
        Assert.Single(history);
        Assert.Equal(LotStatus.Draft, history[0].ToStatus);

        var trace = await db.Set<SourceDataLotReconciliationRecord>()
            .Where(x => x.SourceDataImportBatchId == batchId)
            .ToListAsync();
        var traceRecord = Assert.Single(trace);
        Assert.True(traceRecord.IsCreated);
        Assert.Equal(created.LotId, traceRecord.LotId);
        Assert.Equal(targetGroup.GroupKey, traceRecord.RecommendationGroupKey);
        Assert.Null(traceRecord.SkipReason);
    }

    [Fact]
    public async Task ApplyFromImportBatchAsync_DuplicateCode_ShouldStoreSkippedTraceRecord()
    {
        await using var db = TestDbContextFactory.Create();
        var batchId = await SeedReadyBatchAsync(db);
        await db.Set<Lot>().AddAsync(new Lot
        {
            Code = "LOT-DUPLICATE-001",
            Name = "Existing lot",
            Status = LotStatus.Draft
        });
        await db.SaveChangesAsync();

        var recommendationsService = new LotRecommendationsService(db);
        var recommendations = await recommendationsService.BuildFromImportBatchAsync(batchId);
        Assert.NotNull(recommendations);
        var targetGroup = recommendations!.Groups.First();

        var result = await recommendationsService.ApplyFromImportBatchAsync(batchId, new ApplyLotRecommendationsRequest
        {
            Groups =
            [
                new ApplyLotRecommendationGroupRequest
                {
                    GroupKey = targetGroup.GroupKey,
                    LotCode = "LOT-DUPLICATE-001"
                }
            ]
        });

        Assert.Empty(result.CreatedLots);
        var skipped = Assert.Single(result.SkippedGroups);
        Assert.Equal(targetGroup.GroupKey, skipped.GroupKey);
        Assert.Contains("already exists", skipped.Reason, StringComparison.OrdinalIgnoreCase);

        var trace = await db.Set<SourceDataLotReconciliationRecord>()
            .Where(x => x.SourceDataImportBatchId == batchId)
            .ToListAsync();
        var traceRecord = Assert.Single(trace);
        Assert.False(traceRecord.IsCreated);
        Assert.Null(traceRecord.LotId);
        Assert.Contains("already exists", traceRecord.SkipReason, StringComparison.OrdinalIgnoreCase);
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
