using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

public sealed class SlaMonitoringService : ISlaMonitoringService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly INotificationEmailSender _notificationEmailSender;
    private readonly SlaMonitoringOptions _options;

    public SlaMonitoringService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider,
        INotificationEmailSender notificationEmailSender,
        IOptions<SlaMonitoringOptions> options)
    {
        _dbContext = dbContext;
        _dateTimeProvider = dateTimeProvider;
        _notificationEmailSender = notificationEmailSender;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<SlaRuleDto>> GetRulesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<SlaRule>()
            .AsNoTracking()
            .OrderBy(x => x.PurchaseTypeCode)
            .Select(x => MapRule(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SlaRuleDto>> UpsertRulesAsync(
        UpdateSlaRulesRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var normalizedItems = NormalizeRuleItems(request.Items);
        var itemsByCode = normalizedItems
            .ToDictionary(x => x.PurchaseTypeCode, StringComparer.OrdinalIgnoreCase);

        var rules = await _dbContext.Set<SlaRule>()
            .ToListAsync(cancellationToken);
        var rulesByCode = rules.ToDictionary(
            x => NormalizeCode(x.PurchaseTypeCode),
            x => x,
            StringComparer.OrdinalIgnoreCase);

        foreach (var rule in rules)
        {
            rule.IsActive = false;
        }

        foreach (var item in itemsByCode.Values)
        {
            if (!rulesByCode.TryGetValue(item.PurchaseTypeCode, out var rule))
            {
                rule = new SlaRule
                {
                    PurchaseTypeCode = item.PurchaseTypeCode
                };

                _dbContext.Set<SlaRule>().Add(rule);
                rulesByCode[item.PurchaseTypeCode] = rule;
                rules.Add(rule);
            }

            rule.PurchaseTypeCode = item.PurchaseTypeCode;
            rule.WarningDaysBeforeDue = item.WarningDaysBeforeDue;
            rule.IsActive = item.IsActive;
            rule.Description = item.Description;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return rules
            .OrderBy(x => x.PurchaseTypeCode, StringComparer.OrdinalIgnoreCase)
            .Select(MapRule)
            .ToArray();
    }

    public async Task<IReadOnlyList<SlaViolationDto>> ListViolationsAsync(
        bool includeResolved = false,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.SlaViolations
            .AsNoTracking();

        if (!includeResolved)
        {
            query = query.Where(x => !x.IsResolved);
        }

        return await query
            .OrderBy(x => x.IsResolved)
            .ThenByDescending(x => x.Severity)
            .ThenBy(x => x.DueDate)
            .ThenBy(x => x.Title)
            .Select(x => MapViolation(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<SlaViolationDto?> SetViolationReasonAsync(
        Guid violationId,
        UpdateSlaViolationReasonRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var violation = await _dbContext.Set<SlaViolation>()
            .FirstOrDefaultAsync(x => x.Id == violationId, cancellationToken);
        if (violation is null)
        {
            return null;
        }

        var reasonCode = NormalizeNullableCode(request.ReasonCode);
        var reasonComment = NormalizeNullableText(request.ReasonComment);

        if (reasonCode is null)
        {
            violation.ReasonCode = null;
            violation.ReasonComment = null;
            violation.ReasonAssignedAtUtc = null;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return MapViolation(violation);
        }

        var reasonExists = await _dbContext.ReferenceDataEntries
            .AsNoTracking()
            .AnyAsync(x =>
                x.TypeCode == SlaReasonCodes.ReferenceDataTypeCode &&
                x.ItemCode == reasonCode &&
                x.IsActive,
                cancellationToken);

        if (!reasonExists)
        {
            throw new ArgumentException(
                $"Reason code '{reasonCode}' is not found in reference data '{SlaReasonCodes.ReferenceDataTypeCode}'.",
                nameof(request.ReasonCode));
        }

        violation.ReasonCode = reasonCode;
        violation.ReasonComment = reasonComment;
        violation.ReasonAssignedAtUtc = _dateTimeProvider.UtcNow.UtcDateTime;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapViolation(violation);
    }

    public async Task<SlaMonitoringRunResultDto> RunMonitoringCycleAsync(
        bool sendNotifications,
        CancellationToken cancellationToken = default)
    {
        var startedAtUtc = _dateTimeProvider.UtcNow;
        var utcToday = startedAtUtc.UtcDateTime.Date;
        var warningDaysByPurchaseType = await LoadWarningDaysByPurchaseTypeAsync(cancellationToken);
        var activeCandidates = await LoadActiveCandidatesAsync(
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
            BuildViolationKey,
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
            var key = BuildViolationKey(violation);
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
                if (!candidatesByKey.TryGetValue(BuildViolationKey(violation), out var candidate))
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

                var message = BuildNotificationMessage(candidate);
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

    private async Task<Dictionary<string, int>> LoadWarningDaysByPurchaseTypeAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.SlaRules
            .AsNoTracking()
            .Where(x => x.IsActive)
            .ToDictionaryAsync(
                x => NormalizeCode(x.PurchaseTypeCode),
                x => NormalizeWarningDays(x.WarningDaysBeforeDue),
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);
    }

    private async Task<List<ActiveViolationCandidate>> LoadActiveCandidatesAsync(
        DateTime utcToday,
        IReadOnlyDictionary<string, int> warningDaysByPurchaseType,
        CancellationToken cancellationToken)
    {
        var candidates = new List<ActiveViolationCandidate>(256);

        var procedures = await (
                from p in _dbContext.Procedures.AsNoTracking()
                join u in _dbContext.Users.AsNoTracking()
                    on p.ResponsibleCommercialUserId equals u.Id into userJoin
                from user in userJoin.DefaultIfEmpty()
                where p.Status != ProcurementProcedureStatus.Completed &&
                      p.Status != ProcurementProcedureStatus.Canceled
                select new
                {
                    p.Id,
                    p.ObjectName,
                    p.PurchaseTypeCode,
                    p.ProposalDueDate,
                    p.RequiredSubcontractorDeadline,
                    RecipientEmail = user != null ? user.Email : null
                })
            .ToListAsync(cancellationToken);

        foreach (var procedure in procedures)
        {
            var warningDays = ResolveWarningDays(procedure.PurchaseTypeCode, warningDaysByPurchaseType);
            if (procedure.ProposalDueDate.HasValue)
            {
                var severity = ResolveSeverity(procedure.ProposalDueDate.Value, warningDays, utcToday);
                if (severity.HasValue)
                {
                    candidates.Add(new ActiveViolationCandidate(
                        SlaViolationEntityType.ProcedureProposalDueDate,
                        procedure.Id,
                        procedure.ProposalDueDate.Value.Date,
                        severity.Value,
                        $"Процедура: {procedure.ObjectName} (срок подачи предложений)",
                        NormalizeNullableText(procedure.RecipientEmail)));
                }
            }

            if (procedure.RequiredSubcontractorDeadline.HasValue)
            {
                var severity = ResolveSeverity(
                    procedure.RequiredSubcontractorDeadline.Value,
                    warningDays,
                    utcToday);
                if (severity.HasValue)
                {
                    candidates.Add(new ActiveViolationCandidate(
                        SlaViolationEntityType.ProcedureRequiredSubcontractorDeadline,
                        procedure.Id,
                        procedure.RequiredSubcontractorDeadline.Value.Date,
                        severity.Value,
                        $"Процедура: {procedure.ObjectName} (срок привлечения субподрядчика)",
                        NormalizeNullableText(procedure.RecipientEmail)));
                }
            }
        }

        var contracts = await (
                from contract in _dbContext.Contracts.AsNoTracking()
                join procedure in _dbContext.Procedures.AsNoTracking()
                    on contract.ProcedureId equals procedure.Id
                join u in _dbContext.Users.AsNoTracking()
                    on procedure.ResponsibleCommercialUserId equals u.Id into userJoin
                from user in userJoin.DefaultIfEmpty()
                where contract.Status != ContractStatus.Closed &&
                      contract.EndDate.HasValue
                select new
                {
                    contract.Id,
                    contract.ContractNumber,
                    contract.EndDate,
                    procedure.PurchaseTypeCode,
                    RecipientEmail = user != null ? user.Email : null
                })
            .ToListAsync(cancellationToken);

        foreach (var contract in contracts)
        {
            var warningDays = ResolveWarningDays(contract.PurchaseTypeCode, warningDaysByPurchaseType);
            var severity = ResolveSeverity(contract.EndDate!.Value, warningDays, utcToday);
            if (!severity.HasValue)
            {
                continue;
            }

            candidates.Add(new ActiveViolationCandidate(
                SlaViolationEntityType.ContractEndDate,
                contract.Id,
                contract.EndDate.Value.Date,
                severity.Value,
                $"Договор: {contract.ContractNumber} (дата окончания)",
                NormalizeNullableText(contract.RecipientEmail)));
        }

        var milestones = await (
                from milestone in _dbContext.ContractMilestones.AsNoTracking()
                join contract in _dbContext.Contracts.AsNoTracking()
                    on milestone.ContractId equals contract.Id
                join procedure in _dbContext.Procedures.AsNoTracking()
                    on contract.ProcedureId equals procedure.Id
                join u in _dbContext.Users.AsNoTracking()
                    on procedure.ResponsibleCommercialUserId equals u.Id into userJoin
                from user in userJoin.DefaultIfEmpty()
                where milestone.ProgressPercent < 100m &&
                      (contract.Status == ContractStatus.Signed || contract.Status == ContractStatus.Active)
                select new
                {
                    milestone.Id,
                    milestone.Title,
                    milestone.PlannedDate,
                    contract.ContractNumber,
                    procedure.PurchaseTypeCode,
                    RecipientEmail = user != null ? user.Email : null
                })
            .ToListAsync(cancellationToken);

        foreach (var milestone in milestones)
        {
            var warningDays = ResolveWarningDays(milestone.PurchaseTypeCode, warningDaysByPurchaseType);
            var severity = ResolveSeverity(milestone.PlannedDate, warningDays, utcToday);
            if (!severity.HasValue)
            {
                continue;
            }

            candidates.Add(new ActiveViolationCandidate(
                SlaViolationEntityType.ContractMilestone,
                milestone.Id,
                milestone.PlannedDate.Date,
                severity.Value,
                $"Этап договора {milestone.ContractNumber}: {milestone.Title}",
                NormalizeNullableText(milestone.RecipientEmail)));
        }

        return candidates;
    }

    private NotificationEmailMessage BuildNotificationMessage(ActiveViolationCandidate candidate)
    {
        var severityText = candidate.Severity == SlaViolationSeverity.Overdue ? "Просрочка SLA" : "Предупреждение SLA";
        var subject = $"{severityText}: {candidate.Title}";
        var body =
            $"Событие SLA: {severityText}{Environment.NewLine}" +
            $"Объект: {candidate.Title}{Environment.NewLine}" +
            $"Срок: {candidate.DueDate:yyyy-MM-dd}{Environment.NewLine}" +
            $"Тип: {candidate.EntityType}{Environment.NewLine}";

        return new NotificationEmailMessage(candidate.RecipientEmail!, subject, body);
    }

    private IReadOnlyList<NormalizedSlaRuleItem> NormalizeRuleItems(IReadOnlyList<UpsertSlaRuleItemRequest> items)
    {
        if (items.Count == 0)
        {
            return Array.Empty<NormalizedSlaRuleItem>();
        }

        var normalized = new List<NormalizedSlaRuleItem>(items.Count);
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in items)
        {
            var code = NormalizeCode(item.PurchaseTypeCode);
            if (string.IsNullOrWhiteSpace(code))
            {
                throw new ArgumentException("PurchaseTypeCode is required.", nameof(items));
            }

            if (!seenCodes.Add(code))
            {
                throw new ArgumentException($"Duplicate PurchaseTypeCode '{code}' in SLA rules request.", nameof(items));
            }

            var warningDays = NormalizeWarningDays(item.WarningDaysBeforeDue);
            normalized.Add(new NormalizedSlaRuleItem(
                code,
                warningDays,
                item.IsActive,
                NormalizeNullableText(item.Description)));
        }

        return normalized;
    }

    private int ResolveWarningDays(string purchaseTypeCode, IReadOnlyDictionary<string, int> warningDaysByPurchaseType)
    {
        var key = NormalizeCode(purchaseTypeCode);
        if (!string.IsNullOrWhiteSpace(key) && warningDaysByPurchaseType.TryGetValue(key, out var value))
        {
            return NormalizeWarningDays(value);
        }

        return NormalizeWarningDays(_options.DefaultWarningDaysBeforeDue);
    }

    private static int NormalizeWarningDays(int warningDays)
    {
        return warningDays switch
        {
            < 0 => throw new ArgumentException("WarningDaysBeforeDue cannot be negative."),
            > 30 => throw new ArgumentException("WarningDaysBeforeDue cannot be greater than 30."),
            _ => warningDays
        };
    }

    private static SlaViolationSeverity? ResolveSeverity(DateTime dueDate, int warningDays, DateTime utcToday)
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

    private static string BuildViolationKey(SlaViolation violation)
    {
        return BuildViolationKey(violation.EntityType, violation.EntityId, violation.DueDate, violation.Severity);
    }

    private static string BuildViolationKey(
        SlaViolationEntityType entityType,
        Guid entityId,
        DateTime dueDate,
        SlaViolationSeverity severity)
    {
        return $"{entityType}|{entityId:N}|{dueDate:yyyyMMdd}|{severity}";
    }

    private static string NormalizeCode(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private static string? NormalizeNullableCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant();
    }

    private static string? NormalizeNullableText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static SlaRuleDto MapRule(SlaRule rule)
    {
        return new SlaRuleDto(
            rule.Id,
            rule.PurchaseTypeCode,
            rule.WarningDaysBeforeDue,
            rule.IsActive,
            rule.Description);
    }

    private static SlaViolationDto MapViolation(SlaViolation violation)
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

    private sealed record NormalizedSlaRuleItem(
        string PurchaseTypeCode,
        int WarningDaysBeforeDue,
        bool IsActive,
        string? Description);

    private sealed record ActiveViolationCandidate(
        SlaViolationEntityType EntityType,
        Guid EntityId,
        DateTime DueDate,
        SlaViolationSeverity Severity,
        string Title,
        string? RecipientEmail)
    {
        public string Key => BuildViolationKey(EntityType, EntityId, DueDate, Severity);
    }
}
