namespace Subcontractor.Application.Contracts.Models;

public sealed class UpsertContractMonitoringControlPointItemRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ResponsibleRole { get; set; }
    public DateTime PlannedDate { get; set; }
    public DateTime? ForecastDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public decimal ProgressPercent { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyCollection<UpsertContractMonitoringControlPointStageItemRequest> Stages { get; set; }
        = Array.Empty<UpsertContractMonitoringControlPointStageItemRequest>();
}
