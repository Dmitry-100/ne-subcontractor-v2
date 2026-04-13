using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureTransitionPolicy
{
    public static void EnsureTransitionAllowed(
        ProcurementProcedureStatus current,
        ProcurementProcedureStatus target,
        string? reason)
    {
        var allowed = current switch
        {
            ProcurementProcedureStatus.Created =>
                target is ProcurementProcedureStatus.DocumentsPreparation or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.DocumentsPreparation =>
                target is ProcurementProcedureStatus.Created
                    or ProcurementProcedureStatus.OnApproval
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.OnApproval =>
                target is ProcurementProcedureStatus.DocumentsPreparation
                    or ProcurementProcedureStatus.Sent
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.Sent =>
                target is ProcurementProcedureStatus.OnApproval
                    or ProcurementProcedureStatus.OffersReceived
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.OffersReceived =>
                target is ProcurementProcedureStatus.DecisionMade
                    or ProcurementProcedureStatus.Retender
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.Retender =>
                target is ProcurementProcedureStatus.Sent or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.DecisionMade =>
                target is ProcurementProcedureStatus.Completed
                    or ProcurementProcedureStatus.Retender
                    or ProcurementProcedureStatus.Canceled,
            _ => false
        };

        if (!allowed)
        {
            throw new InvalidOperationException($"Transition {current} -> {target} is not allowed in current phase.");
        }

        var isRollback = (int)target < (int)current || target == ProcurementProcedureStatus.Canceled;
        if (isRollback && string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("Reason is required for rollback/cancel transitions.", nameof(reason));
        }
    }
}
