using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla.Models;

namespace Subcontractor.Application.Sla;

public sealed class SlaMonitoringService : ISlaMonitoringService
{
    private readonly SlaRuleAndViolationAdministrationService _administrationService;
    private readonly SlaMonitoringCycleWorkflowService _cycleWorkflowService;

    public SlaMonitoringService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider,
        INotificationEmailSender notificationEmailSender,
        SlaViolationCandidateQueryService candidateQueryService,
        IOptions<SlaMonitoringOptions> options)
        : this(
            new SlaRuleAndViolationAdministrationService(dbContext, dateTimeProvider),
            new SlaMonitoringCycleWorkflowService(dbContext, dateTimeProvider, notificationEmailSender, candidateQueryService),
            options)
    {
    }

    public SlaMonitoringService(
        SlaRuleAndViolationAdministrationService administrationService,
        SlaMonitoringCycleWorkflowService cycleWorkflowService,
        IOptions<SlaMonitoringOptions> options)
    {
        _administrationService = administrationService;
        _cycleWorkflowService = cycleWorkflowService;
        _ = options.Value;
    }

    public async Task<IReadOnlyList<SlaRuleDto>> GetRulesAsync(CancellationToken cancellationToken = default)
    {
        return await _administrationService.GetRulesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SlaRuleDto>> UpsertRulesAsync(
        UpdateSlaRulesRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _administrationService.UpsertRulesAsync(request, cancellationToken);
    }

    public async Task<IReadOnlyList<SlaViolationDto>> ListViolationsAsync(
        bool includeResolved = false,
        CancellationToken cancellationToken = default)
    {
        return await _administrationService.ListViolationsAsync(includeResolved, cancellationToken);
    }

    public async Task<SlaViolationDto?> SetViolationReasonAsync(
        Guid violationId,
        UpdateSlaViolationReasonRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _administrationService.SetViolationReasonAsync(violationId, request, cancellationToken);
    }

    public async Task<SlaMonitoringRunResultDto> RunMonitoringCycleAsync(
        bool sendNotifications,
        CancellationToken cancellationToken = default)
    {
        return await _cycleWorkflowService.RunMonitoringCycleAsync(sendNotifications, cancellationToken);
    }
}
