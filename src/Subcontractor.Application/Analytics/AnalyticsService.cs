using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics.Models;

namespace Subcontractor.Application.Analytics;

public sealed class AnalyticsService : IAnalyticsService
{
    private readonly AnalyticsKpiDashboardQueryService _kpiDashboardQueryService;
    private readonly AnalyticsViewCatalogQueryService _viewCatalogQueryService;

    public AnalyticsService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider)
        : this(
            new AnalyticsKpiDashboardQueryService(dbContext, dateTimeProvider),
            new AnalyticsViewCatalogQueryService())
    {
    }

    internal AnalyticsService(
        AnalyticsKpiDashboardQueryService kpiDashboardQueryService,
        AnalyticsViewCatalogQueryService viewCatalogQueryService)
    {
        _kpiDashboardQueryService = kpiDashboardQueryService;
        _viewCatalogQueryService = viewCatalogQueryService;
    }

    public async Task<AnalyticsKpiDashboardDto> GetKpiDashboardAsync(CancellationToken cancellationToken = default)
    {
        return await _kpiDashboardQueryService.GetKpiDashboardAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AnalyticsViewDescriptorDto>> GetViewCatalogAsync(CancellationToken cancellationToken = default)
    {
        return await _viewCatalogQueryService.GetViewCatalogAsync(cancellationToken);
    }
}
