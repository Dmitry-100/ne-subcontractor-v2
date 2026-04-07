namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class UpdateProcedureShortlistRequest
{
    public IReadOnlyCollection<UpsertProcedureShortlistItemRequest> Items { get; set; } =
        Array.Empty<UpsertProcedureShortlistItemRequest>();

    public string? AdjustmentReason { get; set; }
}
