using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/contractors")]
public sealed class ContractorsController : ApiControllerBase
{
    private readonly IContractorsService _contractorsService;
    private readonly IContractorRatingsService _contractorRatingsService;

    public ContractorsController(
        IContractorsService contractorsService,
        IContractorRatingsService contractorRatingsService)
    {
        _contractorsService = contractorsService;
        _contractorRatingsService = contractorRatingsService;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ContractorsRead)]
    public async Task<IActionResult> List(
        [FromQuery] string? search,
        [FromQuery] int? skip,
        [FromQuery] int? take,
        [FromQuery] bool requireTotalCount,
        CancellationToken cancellationToken)
    {
        var shouldUsePageQuery = requireTotalCount || skip.HasValue || take.HasValue;
        if (!shouldUsePageQuery)
        {
            var result = await _contractorsService.ListAsync(search, cancellationToken);
            return Ok(result);
        }

        var page = await _contractorsService.ListPageAsync(
            search,
            skip ?? 0,
            take ?? 15,
            cancellationToken);
        return Ok(page);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ContractorsRead)]
    public async Task<ActionResult<ContractorDetailsDto>> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _contractorsService.GetByIdAsync(id, cancellationToken);
        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.ContractorsCreate)]
    public async Task<ActionResult<ContractorDetailsDto>> Create([FromBody] CreateContractorRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _contractorsService.CreateAsync(request, cancellationToken);
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
    [Authorize(Policy = PolicyCodes.ContractorsUpdate)]
    public async Task<ActionResult<ContractorDetailsDto>> Update([FromRoute] Guid id, [FromBody] UpdateContractorRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _contractorsService.UpdateAsync(id, request, cancellationToken);
            if (updated is null)
            {
                return NotFound();
            }

            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ContractorsDelete)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _contractorsService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("recalculate-load")]
    [Authorize(Policy = PolicyCodes.ContractorsUpdate)]
    public async Task<ActionResult<object>> RecalculateLoad(CancellationToken cancellationToken)
    {
        var updated = await _contractorsService.RecalculateCurrentLoadsAsync(cancellationToken);
        return Ok(new
        {
            UpdatedContractors = updated
        });
    }

    [HttpGet("rating/model")]
    [Authorize(Policy = PolicyCodes.ContractorsRead)]
    public async Task<ActionResult<ContractorRatingModelDto>> GetActiveRatingModel(CancellationToken cancellationToken)
    {
        var result = await _contractorRatingsService.GetActiveModelAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("rating/model")]
    [Authorize(Policy = PolicyCodes.ContractorsUpdate)]
    public async Task<ActionResult<ContractorRatingModelDto>> UpsertActiveRatingModel(
        [FromBody] UpsertContractorRatingModelRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractorRatingsService.UpsertActiveModelAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("rating/recalculate")]
    [Authorize(Policy = PolicyCodes.ContractorsUpdate)]
    public async Task<ActionResult<ContractorRatingRecalculationResultDto>> RecalculateRatings(
        [FromBody] RecalculateContractorRatingsRequest? request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractorRatingsService.RecalculateRatingsAsync(
                request ?? new RecalculateContractorRatingsRequest(),
                cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id:guid}/rating/manual-assessment")]
    [Authorize(Policy = PolicyCodes.ContractorsUpdate)]
    public async Task<ActionResult<ContractorRatingManualAssessmentDto>> UpsertManualAssessment(
        [FromRoute] Guid id,
        [FromBody] UpsertContractorRatingManualAssessmentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractorRatingsService.UpsertManualAssessmentAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("{id:guid}/rating/history")]
    [Authorize(Policy = PolicyCodes.ContractorsRead)]
    public async Task<ActionResult<IReadOnlyList<ContractorRatingHistoryItemDto>>> GetRatingHistory(
        [FromRoute] Guid id,
        [FromQuery] int top = 50,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _contractorRatingsService.GetHistoryAsync(id, top, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("rating/analytics")]
    [Authorize(Policy = PolicyCodes.ContractorsRead)]
    public async Task<ActionResult<IReadOnlyList<ContractorRatingAnalyticsRowDto>>> GetRatingAnalytics(
        CancellationToken cancellationToken)
    {
        var result = await _contractorRatingsService.GetAnalyticsAsync(cancellationToken);
        return Ok(result);
    }
}
