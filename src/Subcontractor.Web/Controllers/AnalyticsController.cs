using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Analytics;
using Subcontractor.Application.Analytics.Models;
using Subcontractor.Web.Authorization;

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
    public async Task<ActionResult<AnalyticsKpiDashboardDto>> GetKpiDashboard(CancellationToken cancellationToken)
    {
        var result = await _analyticsService.GetKpiDashboardAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("views")]
    [Authorize(Policy = PolicyCodes.AnalyticsRead)]
    public async Task<ActionResult<IReadOnlyList<AnalyticsViewDescriptorDto>>> GetViewCatalog(CancellationToken cancellationToken)
    {
        var result = await _analyticsService.GetViewCatalogAsync(cancellationToken);
        return Ok(result);
    }
}
