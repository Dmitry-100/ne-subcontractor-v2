using Subcontractor.Application.Sla.Models;

namespace Subcontractor.Application.Sla;

public interface ISlaMonitoringService
{
    Task<IReadOnlyList<SlaRuleDto>> GetRulesAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SlaRuleDto>> UpsertRulesAsync(
        UpdateSlaRulesRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SlaViolationDto>> ListViolationsAsync(
        bool includeResolved = false,
        CancellationToken cancellationToken = default);

    Task<SlaViolationDto?> SetViolationReasonAsync(
        Guid violationId,
        UpdateSlaViolationReasonRequest request,
        CancellationToken cancellationToken = default);

    Task<SlaMonitoringRunResultDto> RunMonitoringCycleAsync(
        bool sendNotifications,
        CancellationToken cancellationToken = default);
}
