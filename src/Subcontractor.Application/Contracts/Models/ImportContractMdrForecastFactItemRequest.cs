namespace Subcontractor.Application.Contracts.Models;

public sealed class ImportContractMdrForecastFactItemRequest
{
    public int SourceRowNumber { get; set; }
    public string CardTitle { get; set; } = string.Empty;
    public DateTime ReportingDate { get; set; }
    public string RowCode { get; set; } = string.Empty;
    public decimal ForecastValue { get; set; }
    public decimal FactValue { get; set; }
}
