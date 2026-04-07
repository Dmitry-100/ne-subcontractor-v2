namespace Subcontractor.Application.Contracts.Models;

public sealed class UpsertContractMilestoneItemRequest
{
    public string Title { get; set; } = string.Empty;
    public DateTime PlannedDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public decimal ProgressPercent { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
}
