using Subcontractor.Domain.Projects;

namespace Subcontractor.Application.Projects;

public static class ProjectReadScopePolicy
{
    public static IQueryable<Project> ApplyReadScope(IQueryable<Project> query, ProjectAccessScope? scope)
    {
        if (scope is null || scope.HasGlobalRead)
        {
            return query;
        }

        return query.Where(x => x.GipUserId == scope.AppUserId);
    }
}
