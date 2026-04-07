using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Sla;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/sla")]
public sealed class SlaController : ApiControllerBase
{
    private readonly ISlaMonitoringService _slaMonitoringService;

    public SlaController(ISlaMonitoringService slaMonitoringService)
    {
        _slaMonitoringService = slaMonitoringService;
    }

    [HttpGet("rules")]
    [Authorize(Policy = PolicyCodes.SlaRead)]
    public async Task<ActionResult<IReadOnlyList<SlaRuleDto>>> GetRules(CancellationToken cancellationToken)
    {
        var result = await _slaMonitoringService.GetRulesAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("rules")]
    [Authorize(Policy = PolicyCodes.SlaWrite)]
    public async Task<ActionResult<IReadOnlyList<SlaRuleDto>>> UpsertRules(
        [FromBody] UpdateSlaRulesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _slaMonitoringService.UpsertRulesAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("violations")]
    [Authorize(Policy = PolicyCodes.SlaRead)]
    public async Task<ActionResult<IReadOnlyList<SlaViolationDto>>> ListViolations(
        [FromQuery] bool includeResolved = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _slaMonitoringService.ListViolationsAsync(includeResolved, cancellationToken);
        return Ok(result);
    }

    [HttpPut("violations/{id:guid}/reason")]
    [Authorize(Policy = PolicyCodes.SlaWrite)]
    public async Task<ActionResult<SlaViolationDto>> SetReason(
        [FromRoute] Guid id,
        [FromBody] UpdateSlaViolationReasonRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _slaMonitoringService.SetViolationReasonAsync(id, request, cancellationToken);
            if (result is null)
            {
                return NotFound();
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("run")]
    [Authorize(Policy = PolicyCodes.SlaWrite)]
    public async Task<ActionResult<SlaMonitoringRunResultDto>> RunMonitoringCycle(
        [FromQuery] bool sendNotifications = true,
        CancellationToken cancellationToken = default)
    {
        var result = await _slaMonitoringService.RunMonitoringCycleAsync(sendNotifications, cancellationToken);
        return Ok(result);
    }
}
