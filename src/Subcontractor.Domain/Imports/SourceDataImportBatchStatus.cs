namespace Subcontractor.Domain.Imports;

public enum SourceDataImportBatchStatus
{
    Uploaded = 0,
    Validated = 1,
    ValidatedWithErrors = 2,
    ReadyForLotting = 3,
    Rejected = 4,
    Processing = 5,
    Failed = 6
}
