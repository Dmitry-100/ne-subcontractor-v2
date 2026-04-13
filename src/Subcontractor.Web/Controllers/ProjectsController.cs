using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Projects;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class ProjectsController : ApiControllerBase
{
    private readonly IProjectsService _projectsService;

    public ProjectsController(IProjectsService projectsService)
    {
        _projectsService = projectsService;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ProjectsRead)]
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
            var result = await _projectsService.ListAsync(search, cancellationToken);
            return Ok(result);
        }

        var page = await _projectsService.ListPageAsync(
            search,
            skip ?? 0,
            take ?? 15,
            cancellationToken);

        return Ok(page);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ProjectsRead)]
    public async Task<ActionResult<ProjectDetailsDto>> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _projectsService.GetByIdAsync(id, cancellationToken);
        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.ProjectsCreate)]
    public async Task<ActionResult<ProjectDetailsDto>> Create([FromBody] CreateProjectRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _projectsService.CreateAsync(request, cancellationToken);
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
    [Authorize(Policy = PolicyCodes.ProjectsUpdate)]
    public async Task<ActionResult<ProjectDetailsDto>> Update([FromRoute] Guid id, [FromBody] UpdateProjectRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _projectsService.UpdateAsync(id, request, cancellationToken);
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
    [Authorize(Policy = PolicyCodes.ProjectsDelete)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _projectsService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
