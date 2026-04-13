using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

internal static class LotRecommendationProjectionPolicy
{
    public static LotRecommendationGroupDto ToGroupDto(LotRecommendationGroup group)
    {
        var totalManHours = group.Items.Sum(x => x.ManHours);
        var (minStart, maxFinish) = LotRecommendationGroupingService.GetGroupDateRange(group.Items);

        return new LotRecommendationGroupDto(
            group.GroupKey,
            group.SuggestedLotCode,
            group.SuggestedLotName,
            group.ProjectCode,
            group.DisciplineCode,
            group.Items.Count,
            totalManHours,
            minStart,
            maxFinish,
            group.Items
                .Select(x => new LotRecommendationRowDto(
                    x.SourceRowId,
                    x.RowNumber,
                    x.ProjectCode,
                    x.ObjectWbs,
                    x.DisciplineCode,
                    x.ManHours,
                    x.PlannedStartDate,
                    x.PlannedFinishDate))
                .ToArray());
    }

    public static SourceDataLotReconciliationRecord CreateTraceRecord(
        Guid batchId,
        Guid applyOperationId,
        LotRecommendationGroup group,
        string lotCode,
        string lotName,
        decimal totalManHours,
        DateTime? plannedStartDate,
        DateTime? plannedFinishDate,
        bool isCreated,
        Lot? lot,
        string? skipReason)
    {
        return new SourceDataLotReconciliationRecord
        {
            SourceDataImportBatchId = batchId,
            ApplyOperationId = applyOperationId,
            RecommendationGroupKey = group.GroupKey,
            ProjectCode = group.ProjectCode,
            DisciplineCode = group.DisciplineCode,
            RequestedLotCode = lotCode,
            RequestedLotName = lotName,
            SourceRowsCount = group.Items.Count,
            TotalManHours = totalManHours,
            PlannedStartDate = plannedStartDate,
            PlannedFinishDate = plannedFinishDate,
            IsCreated = isCreated,
            Lot = lot,
            SkipReason = skipReason
        };
    }
}
