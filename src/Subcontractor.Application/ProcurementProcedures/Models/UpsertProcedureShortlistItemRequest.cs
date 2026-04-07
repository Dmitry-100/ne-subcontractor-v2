namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class UpsertProcedureShortlistItemRequest
{
    public Guid ContractorId { get; set; }
    public bool IsIncluded { get; set; } = true;
    public int SortOrder { get; set; }
    public string? ExclusionReason { get; set; }
    public string? Notes { get; set; }
}
