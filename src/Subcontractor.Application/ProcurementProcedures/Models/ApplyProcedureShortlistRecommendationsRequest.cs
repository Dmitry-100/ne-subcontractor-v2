namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class ApplyProcedureShortlistRecommendationsRequest
{
    public int MaxIncluded { get; set; } = 5;
    public string? AdjustmentReason { get; set; }
}
