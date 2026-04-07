using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcedureExternalApproval : AuditableEntity
{
    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public bool? IsApproved { get; set; }
    public DateTime? DecisionDate { get; set; }
    public Guid? ResponsibleUserId { get; set; }
    public Guid? ProtocolFileId { get; set; }
    public string? Comment { get; set; }
}
