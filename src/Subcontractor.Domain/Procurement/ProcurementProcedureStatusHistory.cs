using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcurementProcedureStatusHistory : AuditableEntity
{
    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public ProcurementProcedureStatus? FromStatus { get; set; }
    public ProcurementProcedureStatus ToStatus { get; set; }
    public string Reason { get; set; } = string.Empty;
}
