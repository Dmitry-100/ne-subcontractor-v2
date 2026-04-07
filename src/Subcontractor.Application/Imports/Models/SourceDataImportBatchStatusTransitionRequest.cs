using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports.Models;

public sealed class SourceDataImportBatchStatusTransitionRequest
{
    public SourceDataImportBatchStatus TargetStatus { get; set; }
    public string? Reason { get; set; }
}
