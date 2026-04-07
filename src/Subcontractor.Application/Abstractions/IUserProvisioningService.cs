using System.Security.Claims;

namespace Subcontractor.Application.Abstractions;

public interface IUserProvisioningService
{
    Task EnsureCurrentUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
}
