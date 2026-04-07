using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Contracts;

public sealed class ContractMdrRow : SoftDeletableEntity
{
    public Guid CardId { get; set; }
    public ContractMdrCard Card { get; set; } = null!;

    public string RowCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
    public decimal PlanValue { get; set; }
    public decimal ForecastValue { get; set; }
    public decimal FactValue { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
}
