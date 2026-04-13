using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Application.Analytics;
using Subcontractor.Application.Analytics.Models;
using Subcontractor.Web.Authorization;
using Subcontractor.Web.Configuration;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/analytics")]
public sealed class AnalyticsController : ApiControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("kpi")]
    [Authorize(Policy = PolicyCodes.AnalyticsRead)]
    [OutputCache(PolicyName = WebServiceCollectionExtensions.AnalyticsKpiReadOutputCachePolicyName)]
    public async Task<ActionResult<AnalyticsKpiDashboardDto>> GetKpiDashboard(CancellationToken cancellationToken)
    {
        var result = await _analyticsService.GetKpiDashboardAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("views")]
    [Authorize(Policy = PolicyCodes.AnalyticsRead)]
    [OutputCache(PolicyName = WebServiceCollectionExtensions.AnalyticsViewsReadOutputCachePolicyName)]
    public async Task<ActionResult<IReadOnlyList<AnalyticsViewDescriptorDto>>> GetViewCatalog(CancellationToken cancellationToken)
    {
        var result = await _analyticsService.GetViewCatalogAsync(cancellationToken);
        return Ok(result);
    }
}
