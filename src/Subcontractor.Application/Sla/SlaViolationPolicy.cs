using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

internal static class SlaViolationPolicy
{
    internal static SlaViolationSeverity? ResolveSeverity(DateTime dueDate, int warningDays, DateTime utcToday)
    {
        var normalizedDueDate = dueDate.Date;
        if (normalizedDueDate < utcToday)
        {
            return SlaViolationSeverity.Overdue;
        }

        if (normalizedDueDate <= utcToday.AddDays(warningDays))
        {
            return SlaViolationSeverity.Warning;
        }

        return null;
    }

    internal static string BuildViolationKey(SlaViolation violation)
    {
        return BuildViolationKey(violation.EntityType, violation.EntityId, violation.DueDate, violation.Severity);
    }

    internal static string BuildViolationKey(
        SlaViolationEntityType entityType,
        Guid entityId,
        DateTime dueDate,
        SlaViolationSeverity severity)
    {
        return $"{entityType}|{entityId:N}|{dueDate:yyyyMMdd}|{severity}";
    }
}
