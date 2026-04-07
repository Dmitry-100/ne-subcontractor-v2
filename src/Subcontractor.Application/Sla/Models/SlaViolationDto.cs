namespace Subcontractor.Application.Sla.Models;

public sealed record SlaViolationDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    DateTime DueDate,
    string Severity,
    string Title,
    string? RecipientEmail,
    bool IsResolved,
    DateTime FirstDetectedAtUtc,
    DateTime LastDetectedAtUtc,
    DateTime? ResolvedAtUtc,
    int NotificationAttempts,
    DateTime? LastNotificationAttemptAtUtc,
    DateTime? LastNotificationSentAtUtc,
    string? LastNotificationError,
    string? ReasonCode,
    string? ReasonComment,
    DateTime? ReasonAssignedAtUtc);
