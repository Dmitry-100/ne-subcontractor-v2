using Subcontractor.Domain.Common;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Domain.Imports;

public sealed class SourceDataLotReconciliationRecord : AuditableEntity
{
    public Guid SourceDataImportBatchId { get; set; }
    public SourceDataImportBatch SourceDataImportBatch { get; set; } = null!;

    public Guid ApplyOperationId { get; set; }
    public string RecommendationGroupKey { get; set; } = string.Empty;
    public string ProjectCode { get; set; } = string.Empty;
    public string DisciplineCode { get; set; } = string.Empty;
    public string RequestedLotCode { get; set; } = string.Empty;
    public string RequestedLotName { get; set; } = string.Empty;
    public int SourceRowsCount { get; set; }
    public decimal TotalManHours { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedFinishDate { get; set; }
    public bool IsCreated { get; set; }
    public Guid? LotId { get; set; }
    public Lot? Lot { get; set; }
    public string? SkipReason { get; set; }
}
