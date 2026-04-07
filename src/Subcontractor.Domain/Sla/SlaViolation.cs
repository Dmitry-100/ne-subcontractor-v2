using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Sla;

public sealed class SlaViolation : AuditableEntity
{
    public SlaViolationEntityType EntityType { get; set; }
    public Guid EntityId { get; set; }
    public DateTime DueDate { get; set; }
    public SlaViolationSeverity Severity { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? RecipientEmail { get; set; }

    public bool IsResolved { get; set; }
    public DateTime FirstDetectedAtUtc { get; set; }
    public DateTime LastDetectedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }

    public int NotificationAttempts { get; set; }
    public DateTime? LastNotificationAttemptAtUtc { get; set; }
    public DateTime? LastNotificationSentAtUtc { get; set; }
    public string? LastNotificationError { get; set; }

    public string? ReasonCode { get; set; }
    public string? ReasonComment { get; set; }
    public DateTime? ReasonAssignedAtUtc { get; set; }
}
