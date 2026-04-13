using Subcontractor.Application.UsersAdministration.Models;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.UsersAdministration;

public static class UsersAdministrationReadProjectionPolicy
{
    public static UserListItemDto ToListItemDto(AppUser user)
    {
        return new UserListItemDto(
            user.Id,
            user.Login,
            user.DisplayName,
            user.Email,
            user.IsActive,
            user.Roles.Select(x => x.AppRole.Name).OrderBy(x => x).ToArray());
    }

    public static UserDetailsDto ToDetailsDto(AppUser user)
    {
        return new UserDetailsDto(
            user.Id,
            user.Login,
            user.DisplayName,
            user.Email,
            user.IsActive,
            user.Roles.Select(x => x.AppRole.Name).OrderBy(x => x).ToArray());
    }
}
