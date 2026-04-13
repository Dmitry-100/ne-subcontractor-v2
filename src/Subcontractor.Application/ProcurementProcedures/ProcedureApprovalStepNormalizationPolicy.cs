using Subcontractor.Application.ProcurementProcedures.Models;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureApprovalStepNormalizationPolicy
{
    public static ProcedureApprovalStepDraft[] Normalize(IReadOnlyCollection<ConfigureProcedureApprovalStepRequest>? steps)
    {
        var result = (steps ?? Array.Empty<ConfigureProcedureApprovalStepRequest>())
            .Select((step, index) =>
            {
                if (step.StepOrder <= 0)
                {
                    throw new ArgumentException($"Step #{index + 1}: stepOrder must be greater than 0.", nameof(step.StepOrder));
                }

                if (string.IsNullOrWhiteSpace(step.StepTitle))
                {
                    throw new ArgumentException($"Step #{index + 1}: stepTitle is required.", nameof(step.StepTitle));
                }

                var normalizedRoleName = NormalizeOptionalText(step.ApproverRoleName);
                if (!step.ApproverUserId.HasValue && string.IsNullOrWhiteSpace(normalizedRoleName))
                {
                    throw new ArgumentException(
                        $"Step #{index + 1}: either approverUserId or approverRoleName must be provided.",
                        nameof(step.ApproverUserId));
                }

                return new ProcedureApprovalStepDraft(
                    step.StepOrder,
                    step.StepTitle.Trim(),
                    step.ApproverUserId,
                    normalizedRoleName,
                    step.IsRequired);
            })
            .OrderBy(x => x.StepOrder)
            .ToArray();

        var duplicateOrder = result
            .GroupBy(x => x.StepOrder)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicateOrder is not null)
        {
            throw new ArgumentException($"Duplicate stepOrder '{duplicateOrder.Key}' in approval route.");
        }

        return result;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

internal readonly record struct ProcedureApprovalStepDraft(
    int StepOrder,
    string StepTitle,
    Guid? ApproverUserId,
    string? ApproverRoleName,
    bool IsRequired);
