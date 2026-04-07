using Microsoft.AspNetCore.Mvc;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
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

