using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Imports;

public sealed class SourceDataImportRow : AuditableEntity
{
    public Guid BatchId { get; set; }
    public SourceDataImportBatch Batch { get; set; } = null!;

    public int RowNumber { get; set; }
    public string ProjectCode { get; set; } = string.Empty;
    public string ObjectWbs { get; set; } = string.Empty;
    public string DisciplineCode { get; set; } = string.Empty;
    public decimal ManHours { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedFinishDate { get; set; }
    public bool IsValid { get; set; }
    public string? ValidationMessage { get; set; }
}
