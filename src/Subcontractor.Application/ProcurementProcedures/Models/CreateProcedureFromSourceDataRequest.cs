namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class CreateProcedureFromSourceDataRequest
{
    public IReadOnlyCollection<Guid> SourceDataRowIds { get; set; } = Array.Empty<Guid>();
    public Guid TechnicalAssignmentFileId { get; set; }
    public string? LotCode { get; set; }
    public string? LotName { get; set; }
    public string? RequestTitle { get; set; }
    public string? WorkScope { get; set; }
    public string PurchaseTypeCode { get; set; } = "SUBCONTRACT";
    public DateTime? RequiredSubcontractorDeadline { get; set; }
    public Guid? ResponsibleCommercialUserId { get; set; }
    public string? Notes { get; set; }
}

public sealed record ProcedureFromSourceDataResultDto(
    Guid ProcedureId,
    Guid LotId,
    int SourceRowsCount,
    decimal TotalManHours,
    ProcedureDetailsDto Procedure);
