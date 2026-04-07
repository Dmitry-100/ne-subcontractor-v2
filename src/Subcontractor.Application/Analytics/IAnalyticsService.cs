using Subcontractor.Application.Analytics.Models;

namespace Subcontractor.Application.Analytics;

public interface IAnalyticsService
{
    Task<AnalyticsKpiDashboardDto> GetKpiDashboardAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AnalyticsViewDescriptorDto>> GetViewCatalogAsync(CancellationToken cancellationToken = default);
}
