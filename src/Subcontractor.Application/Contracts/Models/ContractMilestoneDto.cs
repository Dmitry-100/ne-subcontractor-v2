namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractMilestoneDto(
    Guid Id,
    string Title,
    DateTime PlannedDate,
    DateTime? ActualDate,
    decimal ProgressPercent,
    int SortOrder,
    string? Notes,
    bool IsOverdue);
