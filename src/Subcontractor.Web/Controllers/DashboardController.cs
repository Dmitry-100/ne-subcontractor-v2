using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Dashboard;
using Subcontractor.Application.Dashboard.Models;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    [Authorize]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        var result = await _dashboardService.GetSummaryAsync(cancellationToken);
        return Ok(result);
    }
}
