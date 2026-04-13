using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

internal static class SlaReadProjectionPolicy
{
    internal static SlaRuleDto MapRule(SlaRule rule)
    {
        return new SlaRuleDto(
            rule.Id,
            rule.PurchaseTypeCode,
            rule.WarningDaysBeforeDue,
            rule.IsActive,
            rule.Description);
    }

    internal static SlaViolationDto MapViolation(SlaViolation violation)
    {
        return new SlaViolationDto(
            violation.Id,
            violation.EntityType.ToString(),
            violation.EntityId,
            violation.DueDate,
            violation.Severity.ToString(),
            violation.Title,
            violation.RecipientEmail,
            violation.IsResolved,
            violation.FirstDetectedAtUtc,
            violation.LastDetectedAtUtc,
            violation.ResolvedAtUtc,
            violation.NotificationAttempts,
            violation.LastNotificationAttemptAtUtc,
            violation.LastNotificationSentAtUtc,
            violation.LastNotificationError,
            violation.ReasonCode,
            violation.ReasonComment,
            violation.ReasonAssignedAtUtc);
    }
}
