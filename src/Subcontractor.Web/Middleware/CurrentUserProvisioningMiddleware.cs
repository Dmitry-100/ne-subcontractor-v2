using Subcontractor.Application.Abstractions;

namespace Subcontractor.Web.Middleware;

public sealed class CurrentUserProvisioningMiddleware
{
    private readonly RequestDelegate _next;

    public CurrentUserProvisioningMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IUserProvisioningService userProvisioningService)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            await userProvisioningService.EnsureCurrentUserAsync(context.User, context.RequestAborted);
        }

        await _next(context);
    }
}
