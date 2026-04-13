using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

public sealed class LotRecommendationApplyWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public LotRecommendationApplyWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ApplyLotRecommendationsResultDto> ApplyAsync(
        SourceDataImportBatch batch,
        IReadOnlyCollection<LotRecommendationGroup> groups,
        ApplyLotRecommendationsRequest? request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(batch);
        ArgumentNullException.ThrowIfNull(groups);
        request ??= new ApplyLotRecommendationsRequest();

        if (batch.Status != SourceDataImportBatchStatus.ReadyForLotting)
        {
            throw new InvalidOperationException("Lot creation is allowed only for ReadyForLotting batches.");
        }

        if (groups.Count == 0)
        {
            return new ApplyLotRecommendationsResultDto(batch.Id, 0, Array.Empty<CreatedLotFromRecommendationDto>(), Array.Empty<SkippedLotRecommendationDto>());
        }

        var requestedGroups = request.Groups?.ToArray() ?? Array.Empty<ApplyLotRecommendationGroupRequest>();
        var requestedByKey = requestedGroups
            .Where(x => !string.IsNullOrWhiteSpace(x.GroupKey))
            .GroupBy(x => x.GroupKey.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => x.Last(), StringComparer.OrdinalIgnoreCase);

        var selectedGroups = requestedByKey.Count == 0
            ? groups
            : groups.Where(x => requestedByKey.ContainsKey(x.GroupKey)).ToArray();

        var requestedCount = selectedGroups.Count;
        if (requestedCount == 0)
        {
            return new ApplyLotRecommendationsResultDto(batch.Id, 0, Array.Empty<CreatedLotFromRecommendationDto>(), Array.Empty<SkippedLotRecommendationDto>());
        }

        var existingCodes = await _dbContext.Lots
            .AsNoTracking()
            .Select(x => x.Code)
            .ToListAsync(cancellationToken);
        var usedCodes = existingCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var createdLots = new List<CreatedLotFromRecommendationDto>();
        var skippedGroups = new List<SkippedLotRecommendationDto>();
        var applyOperationId = Guid.NewGuid();

        foreach (var group in selectedGroups)
        {
            var selection = requestedByKey.TryGetValue(group.GroupKey, out var requestGroup)
                ? requestGroup
                : null;

            var lotCode = LotRecommendationPolicy.NormalizeLotCode(selection?.LotCode, group.SuggestedLotCode);
            var lotName = LotRecommendationPolicy.NormalizeLotName(selection?.LotName, group.SuggestedLotName);
            var (plannedStartDate, plannedFinishDate) = LotRecommendationGroupingService.GetGroupDateRange(group.Items);
            var totalManHours = group.Items.Sum(x => x.ManHours);

            if (group.Items.Any(x => x.ProjectId is null))
            {
                const string skipReason = "One or more items cannot be mapped to project id.";
                skippedGroups.Add(new SkippedLotRecommendationDto(group.GroupKey, skipReason));
                await _dbContext.Set<SourceDataLotReconciliationRecord>().AddAsync(
                    LotRecommendationProjectionPolicy.CreateTraceRecord(
                        batch.Id,
                        applyOperationId,
                        group,
                        lotCode,
                        lotName,
                        totalManHours,
                        plannedStartDate,
                        plannedFinishDate,
                        isCreated: false,
                        lot: null,
                        skipReason),
                    cancellationToken);
                continue;
            }

            if (!usedCodes.Add(lotCode))
            {
                var skipReason = $"Lot code '{lotCode}' already exists.";
                skippedGroups.Add(new SkippedLotRecommendationDto(group.GroupKey, skipReason));
                await _dbContext.Set<SourceDataLotReconciliationRecord>().AddAsync(
                    LotRecommendationProjectionPolicy.CreateTraceRecord(
                        batch.Id,
                        applyOperationId,
                        group,
                        lotCode,
                        lotName,
                        totalManHours,
                        plannedStartDate,
                        plannedFinishDate,
                        isCreated: false,
                        lot: null,
                        skipReason),
                    cancellationToken);
                continue;
            }

            var lot = new Lot
            {
                Code = lotCode,
                Name = lotName,
                Status = LotStatus.Draft
            };

            foreach (var item in group.Items)
            {
                lot.Items.Add(new LotItem
                {
                    ProjectId = item.ProjectId!.Value,
                    ObjectWbs = item.ObjectWbs,
                    DisciplineCode = item.DisciplineCode,
                    ManHours = item.ManHours,
                    PlannedStartDate = item.PlannedStartDate,
                    PlannedFinishDate = item.PlannedFinishDate
                });
            }

            await _dbContext.Set<Lot>().AddAsync(lot, cancellationToken);
            await _dbContext.Set<LotStatusHistory>().AddAsync(new LotStatusHistory
            {
                Lot = lot,
                FromStatus = null,
                ToStatus = LotStatus.Draft,
                Reason = $"Created from import batch {batch.Id} group {group.GroupKey}."
            }, cancellationToken);
            await _dbContext.Set<SourceDataLotReconciliationRecord>().AddAsync(
                LotRecommendationProjectionPolicy.CreateTraceRecord(
                    batch.Id,
                    applyOperationId,
                    group,
                    lotCode,
                    lotName,
                    totalManHours,
                    plannedStartDate,
                    plannedFinishDate,
                    isCreated: true,
                    lot,
                    skipReason: null),
                cancellationToken);

            createdLots.Add(new CreatedLotFromRecommendationDto(
                group.GroupKey,
                lot.Id,
                lot.Code,
                lot.Name,
                lot.Items.Count,
                totalManHours));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ApplyLotRecommendationsResultDto(
            batch.Id,
            requestedCount,
            createdLots,
            skippedGroups);
    }
}
