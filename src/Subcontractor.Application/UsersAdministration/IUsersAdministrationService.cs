using Subcontractor.Application.UsersAdministration.Models;

namespace Subcontractor.Application.UsersAdministration;

public interface IUsersAdministrationService
{
    Task<IReadOnlyList<UserListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default);
    Task<UserDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserDetailsDto?> UpdateRolesAsync(Guid id, UpdateUserRolesRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RoleLookupItemDto>> ListRolesAsync(CancellationToken cancellationToken = default);
}
