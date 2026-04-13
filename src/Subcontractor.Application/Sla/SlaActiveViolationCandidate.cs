using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

internal sealed record SlaActiveViolationCandidate(
    SlaViolationEntityType EntityType,
    Guid EntityId,
    DateTime DueDate,
    SlaViolationSeverity Severity,
    string Title,
    string? RecipientEmail)
{
    internal string Key => SlaViolationPolicy.BuildViolationKey(EntityType, EntityId, DueDate, Severity);
}
