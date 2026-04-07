namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class UpdateProcedureOutcomeRequest
{
    public Guid? WinnerContractorId { get; set; }
    public DateTime? DecisionDate { get; set; }
    public Guid? ProtocolFileId { get; set; }
    public bool IsCanceled { get; set; }
    public string? CancellationReason { get; set; }
    public string? Comment { get; set; }
}
