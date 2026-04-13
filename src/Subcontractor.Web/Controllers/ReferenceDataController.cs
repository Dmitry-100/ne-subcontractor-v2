using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Web.Authorization;
using Subcontractor.Web.Configuration;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/reference-data/{typeCode}/items")]
public sealed class ReferenceDataController : ApiControllerBase
{
    private readonly IReferenceDataService _referenceDataService;
    private readonly IOutputCacheStore? _outputCacheStore;

    public ReferenceDataController(
        IReferenceDataService referenceDataService,
        IOutputCacheStore? outputCacheStore = null)
    {
        _referenceDataService = referenceDataService;
        _outputCacheStore = outputCacheStore;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ReferenceDataRead)]
    [OutputCache(PolicyName = WebServiceCollectionExtensions.ReferenceDataReadOutputCachePolicyName)]
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
            await InvalidateReferenceDataCacheAsync(cancellationToken);
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
            if (deleted)
            {
                await InvalidateReferenceDataCacheAsync(cancellationToken);
            }

            return deleted ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    private async Task InvalidateReferenceDataCacheAsync(CancellationToken cancellationToken)
    {
        if (_outputCacheStore is null)
        {
            return;
        }

        await _outputCacheStore.EvictByTagAsync(
            WebServiceCollectionExtensions.ReferenceDataOutputCacheTag,
            cancellationToken);
    }
}
