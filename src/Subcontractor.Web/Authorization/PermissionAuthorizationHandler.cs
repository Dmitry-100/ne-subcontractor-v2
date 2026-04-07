using Microsoft.AspNetCore.Authorization;
using Subcontractor.Application.Abstractions;

namespace Subcontractor.Web.Authorization;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IPermissionEvaluator _permissionEvaluator;

    public PermissionAuthorizationHandler(IPermissionEvaluator permissionEvaluator)
    {
        _permissionEvaluator = permissionEvaluator;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var login = context.User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(login))
        {
            return;
        }

        var hasPermission = await _permissionEvaluator.HasPermissionAsync(login, requirement.PermissionCode);
        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}

