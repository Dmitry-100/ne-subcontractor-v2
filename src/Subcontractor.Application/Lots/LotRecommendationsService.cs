using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Lots;

public sealed class LotRecommendationsService : ILotRecommendationsService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly LotRecommendationGroupingService _groupingService;
    private readonly LotRecommendationApplyWorkflowService _applyWorkflowService;

    internal LotRecommendationsService(IApplicationDbContext dbContext)
        : this(
            dbContext,
            new LotRecommendationGroupingService(dbContext),
            new LotRecommendationApplyWorkflowService(dbContext))
    {
    }

    internal LotRecommendationsService(
        IApplicationDbContext dbContext,
        LotRecommendationGroupingService groupingService,
        LotRecommendationApplyWorkflowService applyWorkflowService)
    {
        _dbContext = dbContext;
        _groupingService = groupingService;
        _applyWorkflowService = applyWorkflowService;
    }

    public async Task<LotRecommendationsDto?> BuildFromImportBatchAsync(
        Guid batchId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == batchId, cancellationToken);
        if (batch is null)
        {
            return null;
        }

        var groups = await _groupingService.BuildGroupsAsync(batch, cancellationToken);
        var canApply = batch.Status == SourceDataImportBatchStatus.ReadyForLotting;
        var note = canApply
            ? null
            : "Lot creation is available after batch transition to ReadyForLotting.";

        return new LotRecommendationsDto(
            batch.Id,
            batch.Status,
            canApply,
            note,
            groups.Sum(x => x.Items.Count),
            groups.Select(LotRecommendationProjectionPolicy.ToGroupDto).ToArray());
    }

    public async Task<ApplyLotRecommendationsResultDto> ApplyFromImportBatchAsync(
        Guid batchId,
        ApplyLotRecommendationsRequest request,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == batchId, cancellationToken);
        if (batch is null)
        {
            throw new KeyNotFoundException($"Import batch '{batchId}' was not found.");
        }

        var groups = await _groupingService.BuildGroupsAsync(batch, cancellationToken);
        return await _applyWorkflowService.ApplyAsync(batch, groups, request, cancellationToken);
    }
}
