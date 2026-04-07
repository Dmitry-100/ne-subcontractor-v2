using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/reference-data/{typeCode}/items")]
public sealed class ReferenceDataController : ApiControllerBase
{
    private readonly IReferenceDataService _referenceDataService;

    public ReferenceDataController(IReferenceDataService referenceDataService)
    {
        _referenceDataService = referenceDataService;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ReferenceDataRead)]
    public async Task<ActionResult<IReadOnlyList<ReferenceDataItemDto>>> List(
        [FromRoute] string typeCode,
        [FromQuery] bool activeOnly = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _referenceDataService.ListAsync(typeCode, activeOnly, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPut]
    [Authorize(Policy = PolicyCodes.ReferenceDataWrite)]
    public async Task<ActionResult<ReferenceDataItemDto>> Upsert(
        [FromRoute] string typeCode,
        [FromBody] UpsertReferenceDataItemRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _referenceDataService.UpsertAsync(typeCode, request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpDelete("{itemCode}")]
    [Authorize(Policy = PolicyCodes.ReferenceDataWrite)]
    public async Task<IActionResult> Delete(
        [FromRoute] string typeCode,
        [FromRoute] string itemCode,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var deleted = await _referenceDataService.DeleteAsync(typeCode, itemCode, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }
}
