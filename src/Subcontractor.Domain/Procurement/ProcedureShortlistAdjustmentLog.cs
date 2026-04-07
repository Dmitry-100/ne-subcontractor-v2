using Subcontractor.Domain.Common;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcedureShortlistAdjustmentLog : AuditableEntity
{
    public Guid OperationId { get; set; }

    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public Guid ContractorId { get; set; }
    public Contractor Contractor { get; set; } = null!;

    public bool? PreviousIsIncluded { get; set; }
    public bool NewIsIncluded { get; set; }

    public int? PreviousSortOrder { get; set; }
    public int NewSortOrder { get; set; }

    public string? PreviousExclusionReason { get; set; }
    public string? NewExclusionReason { get; set; }

    public string Reason { get; set; } = string.Empty;
}
