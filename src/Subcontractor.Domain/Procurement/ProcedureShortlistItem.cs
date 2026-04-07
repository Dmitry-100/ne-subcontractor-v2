using Subcontractor.Domain.Common;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcedureShortlistItem : AuditableEntity
{
    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public Guid ContractorId { get; set; }
    public Contractor Contractor { get; set; } = null!;

    public bool IsIncluded { get; set; } = true;
    public int SortOrder { get; set; }
    public string? ExclusionReason { get; set; }
    public string? Notes { get; set; }
}
