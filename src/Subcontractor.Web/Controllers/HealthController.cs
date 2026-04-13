using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Web.Configuration;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    [OutputCache(PolicyName = WebServiceCollectionExtensions.HealthCheckOutputCachePolicyName)]
    public IActionResult Get()
    {
        return Ok(new
        {
            service = "Subcontractor.Web",
            status = "healthy",
            timestampUtc = DateTimeOffset.UtcNow
        });
    }
}
