namespace Subcontractor.Application.Projects.Models;

public sealed record ProjectListItemDto(
    Guid Id,
    string Code,
    string Name,
    Guid? GipUserId
);

