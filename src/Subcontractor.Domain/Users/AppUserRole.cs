namespace Subcontractor.Domain.Users;

public sealed class AppUserRole
{
    public Guid AppUserId { get; set; }
    public AppUser AppUser { get; set; } = null!;

    public Guid AppRoleId { get; set; }
    public AppRole AppRole { get; set; } = null!;
}

