namespace Subcontractor.Application.Dashboard;

public sealed record DashboardUserContext(
    Guid AppUserId,
    IReadOnlySet<string> RoleNames,
    IReadOnlySet<string> Permissions,
    bool HasProjectsGlobalRead);
