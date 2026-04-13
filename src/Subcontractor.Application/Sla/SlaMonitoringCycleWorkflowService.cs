using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

public sealed class SlaMonitoringCycleWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly INotificationEmailSender _notificationEmailSender;
    private readonly SlaViolationCandidateQueryService _candidateQueryService;

    public SlaMonitoringCycleWorkflowService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider,
        INotificationEmailSender notificationEmailSender,
        SlaViolationCandidateQueryService candidateQueryService)
    {
        _dbContext = dbContext;
        _dateTimeProvider = dateTimeProvider;
        _notificationEmailSender = notificationEmailSender;
        _candidateQueryService = candidateQueryService;
    }

    public async Task<SlaMonitoringRunResultDto> RunMonitoringCycleAsync(
        bool sendNotifications,
        CancellationToken cancellationToken = default)
    {
        var startedAtUtc = _dateTimeProvider.UtcNow;
        var utcToday = startedAtUtc.UtcDateTime.Date;
        var warningDaysByPurchaseType = await _candidateQueryService.LoadWarningDaysByPurchaseTypeAsync(cancellationToken);
        var activeCandidates = await _candidateQueryService.LoadActiveCandidatesAsync(
            utcToday,
            warningDaysByPurchaseType,
            cancellationToken);

        var activeKeys = activeCandidates
            .Select(x => x.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var candidatesByKey = activeCandidates
            .ToDictionary(x => x.Key, StringComparer.OrdinalIgnoreCase);

        var nowUtc = _dateTimeProvider.UtcNow.UtcDateTime;
        var allViolations = await _dbContext.Set<SlaViolation>()
            .ToListAsync(cancellationToken);
        var violationsByKey = allViolations.ToDictionary(
            SlaViolationPolicy.BuildViolationKey,
            StringComparer.OrdinalIgnoreCase);

        foreach (var candidate in activeCandidates)
        {
            if (!violationsByKey.TryGetValue(candidate.Key, out var violation))
            {
                violation = new SlaViolation
                {
                    EntityType = candidate.EntityType,
                    EntityId = candidate.EntityId,
                    DueDate = candidate.DueDate,
                    Severity = candidate.Severity,
                    Title = candidate.Title,
                    RecipientEmail = candidate.RecipientEmail,
                    IsResolved = false,
                    FirstDetectedAtUtc = nowUtc,
                    LastDetectedAtUtc = nowUtc
                };

                _dbContext.Set<SlaViolation>().Add(violation);
                allViolations.Add(violation);
                violationsByKey[candidate.Key] = violation;
                continue;
            }

            var reopen = violation.IsResolved;
            violation.IsResolved = false;
            violation.ResolvedAtUtc = null;
            violation.Title = candidate.Title;
            violation.RecipientEmail = candidate.RecipientEmail;
            violation.DueDate = candidate.DueDate;
            violation.Severity = candidate.Severity;
            violation.LastDetectedAtUtc = nowUtc;

            if (reopen)
            {
                violation.LastNotificationSentAtUtc = null;
                violation.LastNotificationError = null;
            }
        }

        var resolvedViolations = 0;
        foreach (var violation in allViolations.Where(x => !x.IsResolved))
        {
            var key = SlaViolationPolicy.BuildViolationKey(violation);
            if (activeKeys.Contains(key))
            {
                continue;
            }

            violation.IsResolved = true;
            violation.ResolvedAtUtc = nowUtc;
            violation.LastDetectedAtUtc = nowUtc;
            resolvedViolations++;
        }

        var notificationSuccess = 0;
        var notificationFailure = 0;
        if (sendNotifications)
        {
            foreach (var violation in allViolations.Where(x => !x.IsResolved && x.LastNotificationSentAtUtc is null))
            {
                if (!candidatesByKey.TryGetValue(SlaViolationPolicy.BuildViolationKey(violation), out var candidate))
                {
                    continue;
                }

                violation.NotificationAttempts += 1;
                violation.LastNotificationAttemptAtUtc = nowUtc;

                if (string.IsNullOrWhiteSpace(violation.RecipientEmail))
                {
                    violation.LastNotificationError = "Recipient email is not specified.";
                    notificationFailure++;
                    continue;
                }

                var message = SlaNotificationPolicy.BuildNotificationMessage(candidate);
                var sendResult = await _notificationEmailSender.SendAsync(message, cancellationToken);
                if (sendResult.IsSuccess)
                {
                    violation.LastNotificationSentAtUtc = nowUtc;
                    violation.LastNotificationError = null;
                    notificationSuccess++;
                }
                else
                {
                    violation.LastNotificationError = sendResult.ErrorMessage ?? "Unknown SMTP send error.";
                    notificationFailure++;
                }
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var completedAtUtc = _dateTimeProvider.UtcNow;
        var openViolations = allViolations.Count(x => !x.IsResolved);

        return new SlaMonitoringRunResultDto(
            startedAtUtc,
            completedAtUtc,
            activeCandidates.Count,
            openViolations,
            resolvedViolations,
            notificationSuccess,
            notificationFailure);
    }
}
