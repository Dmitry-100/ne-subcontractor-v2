using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Users;

public sealed class AppRole : SoftDeletableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ICollection<AppUserRole> Users { get; set; } = new List<AppUserRole>();
    public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
}
