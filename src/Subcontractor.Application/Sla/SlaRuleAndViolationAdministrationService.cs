using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

public sealed class SlaRuleAndViolationAdministrationService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;

    public SlaRuleAndViolationAdministrationService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<IReadOnlyList<SlaRuleDto>> GetRulesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<SlaRule>()
            .AsNoTracking()
            .OrderBy(x => x.PurchaseTypeCode)
            .Select(x => SlaReadProjectionPolicy.MapRule(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SlaRuleDto>> UpsertRulesAsync(
        UpdateSlaRulesRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var normalizedItems = SlaRuleConfigurationPolicy.NormalizeRuleItems(request.Items);
        var itemsByCode = normalizedItems
            .ToDictionary(x => x.PurchaseTypeCode, StringComparer.OrdinalIgnoreCase);

        var rules = await _dbContext.Set<SlaRule>()
            .ToListAsync(cancellationToken);
        var rulesByCode = rules.ToDictionary(
            x => SlaRuleConfigurationPolicy.NormalizeCode(x.PurchaseTypeCode),
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
            .Select(SlaReadProjectionPolicy.MapRule)
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
            .Select(x => SlaReadProjectionPolicy.MapViolation(x))
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

        var reasonCode = SlaRuleConfigurationPolicy.NormalizeNullableCode(request.ReasonCode);
        var reasonComment = SlaRuleConfigurationPolicy.NormalizeNullableText(request.ReasonComment);

        if (reasonCode is null)
        {
            violation.ReasonCode = null;
            violation.ReasonComment = null;
            violation.ReasonAssignedAtUtc = null;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return SlaReadProjectionPolicy.MapViolation(violation);
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
        return SlaReadProjectionPolicy.MapViolation(violation);
    }
}
