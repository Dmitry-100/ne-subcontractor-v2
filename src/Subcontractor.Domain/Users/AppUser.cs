using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Users;

public sealed class AppUser : SoftDeletableEntity
{
    public string ExternalId { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<AppUserRole> Roles { get; set; } = new List<AppUserRole>();
}

