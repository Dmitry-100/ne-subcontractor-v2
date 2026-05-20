using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/imports/discipline-mappings")]
public sealed class DisciplineMappingsController : ApiControllerBase
{
    private readonly IDisciplineMappingsService _service;

    public DisciplineMappingsController(IDisciplineMappingsService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<ActionResult<IReadOnlyList<DisciplineMappingDto>>> List(CancellationToken cancellationToken)
    {
        var result = await _service.ListAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut]
    [Authorize(Policy = PolicyCodes.ImportsWrite)]
    public async Task<ActionResult<UpsertDisciplineMappingsResultDto>> Upsert(
        [FromBody] UpsertDisciplineMappingsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.UpsertAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }
}
