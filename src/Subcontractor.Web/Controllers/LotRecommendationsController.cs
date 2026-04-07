using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Lots;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/lots/recommendations/import-batches")]
public sealed class LotRecommendationsController : ApiControllerBase
{
    private readonly ILotRecommendationsService _lotRecommendationsService;

    public LotRecommendationsController(ILotRecommendationsService lotRecommendationsService)
    {
        _lotRecommendationsService = lotRecommendationsService;
    }

    [HttpGet("{batchId:guid}")]
    [Authorize(Policy = PolicyCodes.LotsRead)]
    public async Task<ActionResult<LotRecommendationsDto>> Build(
        [FromRoute] Guid batchId,
        CancellationToken cancellationToken)
    {
        var result = await _lotRecommendationsService.BuildFromImportBatchAsync(batchId, cancellationToken);
        return result is null
            ? NotFoundProblem($"Пакет импорта '{batchId}' не найден.")
            : Ok(result);
    }

    [HttpPost("{batchId:guid}/apply")]
    [Authorize(Policy = PolicyCodes.LotsCreate)]
    public async Task<ActionResult<ApplyLotRecommendationsResultDto>> Apply(
        [FromRoute] Guid batchId,
        [FromBody] ApplyLotRecommendationsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _lotRecommendationsService.ApplyFromImportBatchAsync(batchId, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFoundProblem(ex.Message);
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
