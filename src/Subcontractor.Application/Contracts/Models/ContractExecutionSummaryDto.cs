namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractExecutionSummaryDto(
    Guid ContractId,
    int MilestonesTotal,
    int MilestonesCompleted,
    decimal ProgressPercent,
    int OverdueMilestones,
    DateTime? NextPlannedDate);
