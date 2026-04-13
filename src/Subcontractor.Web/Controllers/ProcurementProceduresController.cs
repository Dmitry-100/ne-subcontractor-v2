using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/procedures")]
public sealed class ProcurementProceduresController : ApiControllerBase
{
    private readonly IProcurementProceduresService _service;

    public ProcurementProceduresController(IProcurementProceduresService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<IActionResult> List(
        [FromQuery] string? search,
        [FromQuery] ProcurementProcedureStatus? status,
        [FromQuery] Guid? lotId,
        [FromQuery] int? skip,
        [FromQuery] int? take,
        [FromQuery] bool requireTotalCount,
        CancellationToken cancellationToken)
    {
        var shouldUsePageQuery = requireTotalCount || skip.HasValue || take.HasValue;
        if (!shouldUsePageQuery)
        {
            var result = await _service.ListAsync(search, status, lotId, cancellationToken);
            return Ok(result);
        }

        var page = await _service.ListPageAsync(
            search,
            status,
            lotId,
            skip ?? 0,
            take ?? 15,
            cancellationToken);

        return Ok(page);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<ProcedureDetailsDto>> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.ProceduresCreate)]
    public async Task<ActionResult<ProcedureDetailsDto>> Create(
        [FromBody] CreateProcedureRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _service.CreateAsync(request, cancellationToken);
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
    [Authorize(Policy = PolicyCodes.ProceduresUpdate)]
    public async Task<ActionResult<ProcedureDetailsDto>> Update(
        [FromRoute] Guid id,
        [FromBody] UpdateProcedureRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
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

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ProceduresDelete)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/transition")]
    [Authorize(Policy = PolicyCodes.ProceduresTransition)]
    public async Task<ActionResult<ProcedureStatusHistoryItemDto>> Transition(
        [FromRoute] Guid id,
        [FromBody] ProcedureStatusTransitionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.TransitionAsync(id, request, cancellationToken);
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
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<IReadOnlyList<ProcedureStatusHistoryItemDto>>> History(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetHistoryAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}/approval/steps")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<IReadOnlyList<ProcedureApprovalStepDto>>> GetApprovalSteps(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetApprovalStepsAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/approval/steps")]
    [Authorize(Policy = PolicyCodes.ProceduresUpdate)]
    public async Task<ActionResult<IReadOnlyList<ProcedureApprovalStepDto>>> ConfigureApprovalSteps(
        [FromRoute] Guid id,
        [FromBody] ConfigureProcedureApprovalRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ConfigureApprovalStepsAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpPost("{id:guid}/approval/steps/{stepId:guid}/decision")]
    [Authorize(Policy = PolicyCodes.ProceduresTransition)]
    public async Task<ActionResult<ProcedureApprovalStepDto>> DecideApprovalStep(
        [FromRoute] Guid id,
        [FromRoute] Guid stepId,
        [FromBody] DecideProcedureApprovalStepRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.DecideApprovalStepAsync(id, stepId, request, cancellationToken);
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

    [HttpGet("{id:guid}/approval/external")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<ProcedureExternalApprovalDto>> GetExternalApproval(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetExternalApprovalAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/approval/external")]
    [Authorize(Policy = PolicyCodes.ProceduresUpdate)]
    public async Task<ActionResult<ProcedureExternalApprovalDto>> UpsertExternalApproval(
        [FromRoute] Guid id,
        [FromBody] UpsertProcedureExternalApprovalRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpsertExternalApprovalAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpGet("{id:guid}/shortlist")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<IReadOnlyList<ProcedureShortlistItemDto>>> GetShortlist(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetShortlistAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/shortlist")]
    [Authorize(Policy = PolicyCodes.ProceduresUpdate)]
    public async Task<ActionResult<IReadOnlyList<ProcedureShortlistItemDto>>> UpsertShortlist(
        [FromRoute] Guid id,
        [FromBody] UpdateProcedureShortlistRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpsertShortlistAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpGet("{id:guid}/shortlist/recommendations")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<IReadOnlyList<ProcedureShortlistRecommendationDto>>> GetShortlistRecommendations(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.BuildShortlistRecommendationsAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/shortlist/recommendations/apply")]
    [Authorize(Policy = PolicyCodes.ProceduresUpdate)]
    public async Task<ActionResult<ApplyProcedureShortlistRecommendationsResultDto>> ApplyShortlistRecommendations(
        [FromRoute] Guid id,
        [FromBody] ApplyProcedureShortlistRecommendationsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.ApplyShortlistRecommendationsAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpGet("{id:guid}/shortlist/adjustments")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>>> GetShortlistAdjustments(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetShortlistAdjustmentsAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/offers")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<IReadOnlyList<ProcedureOfferDto>>> GetOffers(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetOffersAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/offers")]
    [Authorize(Policy = PolicyCodes.ProceduresUpdate)]
    public async Task<ActionResult<IReadOnlyList<ProcedureOfferDto>>> UpsertOffers(
        [FromRoute] Guid id,
        [FromBody] UpdateProcedureOffersRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpsertOffersAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpGet("{id:guid}/comparison")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<IReadOnlyList<ProcedureComparisonRowDto>>> GetComparison(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetComparisonAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/outcome")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<ActionResult<ProcedureOutcomeDto>> GetOutcome(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.GetOutcomeAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/outcome")]
    [Authorize(Policy = PolicyCodes.ProceduresUpdate)]
    public async Task<ActionResult<ProcedureOutcomeDto>> UpsertOutcome(
        [FromRoute] Guid id,
        [FromBody] UpdateProcedureOutcomeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpsertOutcomeAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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
}
