using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/lots")]
public sealed class LotsController : ApiControllerBase
{
    private readonly ILotsService _lotsService;

    public LotsController(ILotsService lotsService)
    {
        _lotsService = lotsService;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.LotsRead)]
    public async Task<ActionResult<IReadOnlyList<LotListItemDto>>> List(
        [FromQuery] string? search,
        [FromQuery] LotStatus? status,
        [FromQuery] Guid? projectId,
        CancellationToken cancellationToken)
    {
        var result = await _lotsService.ListAsync(search, status, projectId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PolicyCodes.LotsRead)]
    public async Task<ActionResult<LotDetailsDto>> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _lotsService.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.LotsCreate)]
    public async Task<ActionResult<LotDetailsDto>> Create([FromBody] CreateLotRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _lotsService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PolicyCodes.LotsUpdate)]
    public async Task<ActionResult<LotDetailsDto>> Update(
        [FromRoute] Guid id,
        [FromBody] UpdateLotRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _lotsService.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PolicyCodes.LotsDelete)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _lotsService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/transition")]
    [Authorize(Policy = PolicyCodes.LotsTransition)]
    public async Task<ActionResult<LotStatusHistoryItemDto>> Transition(
        [FromRoute] Guid id,
        [FromBody] LotStatusTransitionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _lotsService.TransitionAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("{id:guid}/history")]
    [Authorize(Policy = PolicyCodes.LotsRead)]
    public async Task<ActionResult<IReadOnlyList<LotStatusHistoryItemDto>>> History(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _lotsService.GetHistoryAsync(id, cancellationToken);
        return Ok(result);
    }
}
