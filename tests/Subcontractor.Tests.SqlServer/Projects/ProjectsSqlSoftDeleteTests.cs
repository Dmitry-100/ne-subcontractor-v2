using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Projects;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Projects;

[Trait("SqlSuite", "Core")]
public sealed class ProjectsSqlSoftDeleteTests
{
    [SqlFact]
    public async Task DeleteAsync_ShouldApplySoftDelete_AndHideEntityByQueryFilter()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("system");
        await using var db = database.CreateDbContext("system");
        var service = new ProjectsService(db, new SqlTestCurrentUserService("system"));

        var created = await service.CreateAsync(new CreateProjectRequest
        {
            Code = "PRJ-SOFT-001",
            Name = "Soft delete project"
        });

        var deleted = await service.DeleteAsync(created.Id);
        Assert.True(deleted);

        var visibleCount = await db.Set<Project>()
            .AsNoTracking()
            .CountAsync(x => x.Id == created.Id);
        Assert.Equal(0, visibleCount);

        var rawEntity = await db.Set<Project>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .SingleAsync(x => x.Id == created.Id);
        Assert.True(rawEntity.IsDeleted);
        Assert.NotNull(rawEntity.DeletedAtUtc);
        Assert.Equal("system", rawEntity.DeletedBy);
    }
}
