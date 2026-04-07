namespace Subcontractor.Application.UsersAdministration.Models;

public sealed record RoleLookupItemDto(
    Guid Id,
    string Name,
    string Description);
