using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Application.Sla;

public sealed class SlaViolationCandidateQueryService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly SlaMonitoringOptions _options;

    public SlaViolationCandidateQueryService(
        IApplicationDbContext dbContext,
        IOptions<SlaMonitoringOptions> options)
    {
        _dbContext = dbContext;
        _options = options.Value;
    }

    internal async Task<Dictionary<string, int>> LoadWarningDaysByPurchaseTypeAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.SlaRules
            .AsNoTracking()
            .Where(x => x.IsActive)
            .ToDictionaryAsync(
                x => SlaRuleConfigurationPolicy.NormalizeCode(x.PurchaseTypeCode),
                x => SlaRuleConfigurationPolicy.NormalizeWarningDays(x.WarningDaysBeforeDue),
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);
    }

    internal async Task<List<SlaActiveViolationCandidate>> LoadActiveCandidatesAsync(
        DateTime utcToday,
        IReadOnlyDictionary<string, int> warningDaysByPurchaseType,
        CancellationToken cancellationToken)
    {
        var candidates = new List<SlaActiveViolationCandidate>(256);

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
            var warningDays = SlaRuleConfigurationPolicy.ResolveWarningDays(
                procedure.PurchaseTypeCode,
                warningDaysByPurchaseType,
                _options.DefaultWarningDaysBeforeDue);
            if (procedure.ProposalDueDate.HasValue)
            {
                var severity = SlaViolationPolicy.ResolveSeverity(procedure.ProposalDueDate.Value, warningDays, utcToday);
                if (severity.HasValue)
                {
                    candidates.Add(new SlaActiveViolationCandidate(
                        SlaViolationEntityType.ProcedureProposalDueDate,
                        procedure.Id,
                        procedure.ProposalDueDate.Value.Date,
                        severity.Value,
                        $"Процедура: {procedure.ObjectName} (срок подачи предложений)",
                        SlaRuleConfigurationPolicy.NormalizeNullableText(procedure.RecipientEmail)));
                }
            }

            if (procedure.RequiredSubcontractorDeadline.HasValue)
            {
                var severity = SlaViolationPolicy.ResolveSeverity(
                    procedure.RequiredSubcontractorDeadline.Value,
                    warningDays,
                    utcToday);
                if (severity.HasValue)
                {
                    candidates.Add(new SlaActiveViolationCandidate(
                        SlaViolationEntityType.ProcedureRequiredSubcontractorDeadline,
                        procedure.Id,
                        procedure.RequiredSubcontractorDeadline.Value.Date,
                        severity.Value,
                        $"Процедура: {procedure.ObjectName} (срок привлечения субподрядчика)",
                        SlaRuleConfigurationPolicy.NormalizeNullableText(procedure.RecipientEmail)));
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
            var warningDays = SlaRuleConfigurationPolicy.ResolveWarningDays(
                contract.PurchaseTypeCode,
                warningDaysByPurchaseType,
                _options.DefaultWarningDaysBeforeDue);
            var severity = SlaViolationPolicy.ResolveSeverity(contract.EndDate!.Value, warningDays, utcToday);
            if (!severity.HasValue)
            {
                continue;
            }

            candidates.Add(new SlaActiveViolationCandidate(
                SlaViolationEntityType.ContractEndDate,
                contract.Id,
                contract.EndDate.Value.Date,
                severity.Value,
                $"Договор: {contract.ContractNumber} (дата окончания)",
                SlaRuleConfigurationPolicy.NormalizeNullableText(contract.RecipientEmail)));
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
            var warningDays = SlaRuleConfigurationPolicy.ResolveWarningDays(
                milestone.PurchaseTypeCode,
                warningDaysByPurchaseType,
                _options.DefaultWarningDaysBeforeDue);
            var severity = SlaViolationPolicy.ResolveSeverity(milestone.PlannedDate, warningDays, utcToday);
            if (!severity.HasValue)
            {
                continue;
            }

            candidates.Add(new SlaActiveViolationCandidate(
                SlaViolationEntityType.ContractMilestone,
                milestone.Id,
                milestone.PlannedDate.Date,
                severity.Value,
                $"Этап договора {milestone.ContractNumber}: {milestone.Title}",
                SlaRuleConfigurationPolicy.NormalizeNullableText(milestone.RecipientEmail)));
        }

        return candidates;
    }
}
