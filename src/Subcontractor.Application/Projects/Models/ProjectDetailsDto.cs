namespace Subcontractor.Application.Projects.Models;

public sealed record ProjectDetailsDto(
    Guid Id,
    string Code,
    string Name,
    Guid? GipUserId
);

