using Subcontractor.Domain.Common;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcedureOutcome : AuditableEntity
{
    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public Guid? WinnerContractorId { get; set; }
    public Contractor? WinnerContractor { get; set; }

    public DateTime? DecisionDate { get; set; }
    public Guid? ProtocolFileId { get; set; }
    public bool IsCanceled { get; set; }
    public string? CancellationReason { get; set; }
    public string? Comment { get; set; }
}
