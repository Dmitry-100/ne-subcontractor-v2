namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class UpsertProcedureExternalApprovalRequest
{
    public bool? IsApproved { get; set; }
    public DateTime? DecisionDate { get; set; }
    public Guid? ResponsibleUserId { get; set; }
    public Guid? ProtocolFileId { get; set; }
    public string? Comment { get; set; }
}
