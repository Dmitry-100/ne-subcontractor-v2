namespace Subcontractor.Application.Contracts.Models;

public sealed class UpsertContractMdrRowItemRequest
{
    public string RowCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
    public decimal PlanValue { get; set; }
    public decimal ForecastValue { get; set; }
    public decimal FactValue { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
}
