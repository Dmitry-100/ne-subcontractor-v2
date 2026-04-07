namespace Subcontractor.Application.Sla.Models;

public sealed record SlaMonitoringRunResultDto(
    DateTimeOffset StartedAtUtc,
    DateTimeOffset CompletedAtUtc,
    int ActiveViolations,
    int OpenViolations,
    int ResolvedViolations,
    int NotificationSuccessCount,
    int NotificationFailureCount);
