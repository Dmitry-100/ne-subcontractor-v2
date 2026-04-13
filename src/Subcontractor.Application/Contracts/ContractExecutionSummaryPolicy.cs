using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

internal static class ContractExecutionSummaryPolicy
{
    public static ContractExecutionSummaryDto BuildSummary(
        Guid contractId,
        IReadOnlyCollection<ContractMilestone> milestones,
        DateTime utcToday)
    {
        var total = milestones.Count;
        var completed = milestones.Count(x => x.ProgressPercent >= 100m);
        var overdue = milestones.Count(x => x.ProgressPercent < 100m && x.PlannedDate.Date < utcToday);
        var progress = total == 0
            ? 0m
            : Math.Round(milestones.Average(x => x.ProgressPercent), 2, MidpointRounding.AwayFromZero);
        var nextPlannedDate = milestones
            .Where(x => x.ProgressPercent < 100m)
            .OrderBy(x => x.PlannedDate)
            .Select(x => (DateTime?)x.PlannedDate)
            .FirstOrDefault();

        return new ContractExecutionSummaryDto(
            contractId,
            total,
            completed,
            progress,
            overdue,
            nextPlannedDate);
    }
}
