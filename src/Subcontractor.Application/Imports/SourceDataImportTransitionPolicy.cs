using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

internal static class SourceDataImportTransitionPolicy
{
    internal static string NormalizeTransitionReason(string? reason)
    {
        return string.IsNullOrWhiteSpace(reason)
            ? "Status changed by operator."
            : reason.Trim();
    }

    internal static void EnsureTransitionAllowed(
        SourceDataImportBatchStatus currentStatus,
        int invalidRows,
        SourceDataImportBatchStatus targetStatus,
        bool hasReason)
    {
        switch (targetStatus)
        {
            case SourceDataImportBatchStatus.ReadyForLotting:
                if (currentStatus != SourceDataImportBatchStatus.Validated)
                {
                    throw new InvalidOperationException($"Transition {currentStatus} -> {targetStatus} is not allowed.");
                }

                if (invalidRows > 0)
                {
                    throw new InvalidOperationException("Batch with invalid rows cannot move to ReadyForLotting.");
                }

                return;

            case SourceDataImportBatchStatus.Rejected:
                if (currentStatus is SourceDataImportBatchStatus.Validated or SourceDataImportBatchStatus.ValidatedWithErrors or SourceDataImportBatchStatus.ReadyForLotting)
                {
                    if (!hasReason)
                    {
                        throw new ArgumentException("Reason is required for transition to Rejected.", "reason");
                    }

                    return;
                }

                throw new InvalidOperationException($"Transition {currentStatus} -> {targetStatus} is not allowed.");

            default:
                throw new InvalidOperationException($"Transition {currentStatus} -> {targetStatus} is not allowed.");
        }
    }

    internal static string TruncateReason(string value)
    {
        var trimmed = value.Trim();
        return trimmed.Length <= 1024 ? trimmed : trimmed[..1024];
    }
}
