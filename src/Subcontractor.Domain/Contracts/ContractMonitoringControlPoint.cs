using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Contracts;

public sealed class ContractMonitoringControlPoint : SoftDeletableEntity
{
    public Guid ContractId { get; set; }
    public Contract Contract { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? ResponsibleRole { get; set; }
    public DateTime PlannedDate { get; set; }
    public DateTime? ForecastDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public decimal ProgressPercent { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }

    public ICollection<ContractMonitoringControlPointStage> Stages { get; set; } = new List<ContractMonitoringControlPointStage>();
}
