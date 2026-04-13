namespace Subcontractor.Application.Projects;

public sealed record ProjectAccessScope(Guid AppUserId, bool HasGlobalRead);
