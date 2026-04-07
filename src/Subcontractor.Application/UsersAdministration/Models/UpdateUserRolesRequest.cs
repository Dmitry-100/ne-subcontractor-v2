namespace Subcontractor.Application.UsersAdministration.Models;

public sealed class UpdateUserRolesRequest
{
    public IReadOnlyCollection<string> RoleNames { get; set; } = Array.Empty<string>();
    public bool? IsActive { get; set; }
}
