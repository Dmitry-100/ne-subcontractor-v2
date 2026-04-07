using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Contracts;

public sealed class ContractMonitoringControlPointStage : SoftDeletableEntity
{
    public Guid ControlPointId { get; set; }
    public ContractMonitoringControlPoint ControlPoint { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public DateTime PlannedDate { get; set; }
    public DateTime? ForecastDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public decimal ProgressPercent { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
}
