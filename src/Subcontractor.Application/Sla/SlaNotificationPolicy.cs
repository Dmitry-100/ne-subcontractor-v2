using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

internal static class SlaNotificationPolicy
{
    internal static NotificationEmailMessage BuildNotificationMessage(SlaActiveViolationCandidate candidate)
    {
        var severityText = candidate.Severity == SlaViolationSeverity.Overdue
            ? "Просрочка SLA"
            : "Предупреждение SLA";
        var subject = $"{severityText}: {candidate.Title}";
        var body =
            $"Событие SLA: {severityText}{Environment.NewLine}" +
            $"Объект: {candidate.Title}{Environment.NewLine}" +
            $"Срок: {candidate.DueDate:yyyy-MM-dd}{Environment.NewLine}" +
            $"Тип: {candidate.EntityType}{Environment.NewLine}";

        return new NotificationEmailMessage(candidate.RecipientEmail!, subject, body);
    }
}
