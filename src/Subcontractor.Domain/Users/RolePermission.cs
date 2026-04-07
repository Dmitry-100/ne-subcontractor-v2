namespace Subcontractor.Domain.Users;

public sealed class RolePermission
{
    public Guid AppRoleId { get; set; }
    public AppRole AppRole { get; set; } = null!;
    public string PermissionCode { get; set; } = string.Empty;
}

