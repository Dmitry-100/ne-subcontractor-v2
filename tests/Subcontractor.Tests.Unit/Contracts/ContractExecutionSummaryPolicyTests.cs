using Subcontractor.Application.Contracts;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractExecutionSummaryPolicyTests
{
    [Fact]
    public void BuildSummary_ShouldReturnZeroMetrics_WhenMilestonesAreEmpty()
    {
        var contractId = Guid.NewGuid();

        var result = ContractExecutionSummaryPolicy.BuildSummary(
            contractId,
            [],
            new DateTime(2026, 4, 10));

        Assert.Equal(contractId, result.ContractId);
        Assert.Equal(0, result.MilestonesTotal);
        Assert.Equal(0, result.MilestonesCompleted);
        Assert.Equal(0m, result.ProgressPercent);
        Assert.Equal(0, result.OverdueMilestones);
        Assert.Null(result.NextPlannedDate);
    }

    [Fact]
    public void BuildSummary_ShouldCalculateCountsProgressAndNextPlannedDate()
    {
        var contractId = Guid.NewGuid();
        var milestones = new[]
        {
            new ContractMilestone
            {
                Title = "M1",
                PlannedDate = new DateTime(2026, 4, 8),
                ProgressPercent = 50m
            },
            new ContractMilestone
            {
                Title = "M2",
                PlannedDate = new DateTime(2026, 4, 12),
                ProgressPercent = 33.335m
            },
            new ContractMilestone
            {
                Title = "M3",
                PlannedDate = new DateTime(2026, 4, 9),
                ProgressPercent = 100m
            }
        };

        var result = ContractExecutionSummaryPolicy.BuildSummary(
            contractId,
            milestones,
            new DateTime(2026, 4, 10));

        Assert.Equal(3, result.MilestonesTotal);
        Assert.Equal(1, result.MilestonesCompleted);
        Assert.Equal(61.11m, result.ProgressPercent);
        Assert.Equal(1, result.OverdueMilestones);
        Assert.Equal(new DateTime(2026, 4, 8), result.NextPlannedDate);
    }
}
