namespace Subcontractor.Application.UsersAdministration.Models;

public sealed record UserListItemDto(
    Guid Id,
    string Login,
    string DisplayName,
    string Email,
    bool IsActive,
    IReadOnlyCollection<string> Roles);
