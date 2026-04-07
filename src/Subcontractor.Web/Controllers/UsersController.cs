using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.UsersAdministration;
using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class UsersController : ApiControllerBase
{
    private readonly IUsersAdministrationService _usersAdministrationService;

    public UsersController(IUsersAdministrationService usersAdministrationService)
    {
        _usersAdministrationService = usersAdministrationService;
    }

    [HttpGet("users")]
    [Authorize(Policy = PolicyCodes.UsersRead)]
    public async Task<ActionResult<IReadOnlyList<UserListItemDto>>> ListUsers(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _usersAdministrationService.ListAsync(search, cancellationToken);
        return Ok(result);
    }

    [HttpGet("users/{id:guid}")]
    [Authorize(Policy = PolicyCodes.UsersRead)]
    public async Task<ActionResult<UserDetailsDto>> GetUser(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _usersAdministrationService.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("users/{id:guid}/roles")]
    [Authorize(Policy = PolicyCodes.UsersWrite)]
    public async Task<ActionResult<UserDetailsDto>> UpdateUserRoles(
        [FromRoute] Guid id,
        [FromBody] UpdateUserRolesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _usersAdministrationService.UpdateRolesAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("roles")]
    [Authorize(Policy = PolicyCodes.UsersRead)]
    public async Task<ActionResult<IReadOnlyList<RoleLookupItemDto>>> ListRoles(CancellationToken cancellationToken)
    {
        var result = await _usersAdministrationService.ListRolesAsync(cancellationToken);
        return Ok(result);
    }
}
