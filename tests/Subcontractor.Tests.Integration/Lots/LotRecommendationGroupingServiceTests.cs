using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Application.Lots;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotRecommendationGroupingServiceTests
{
    [Fact]
    public async Task BuildGroupsAsync_ShouldGroupValidRows_AndSortDeterministically()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Project>().AddRangeAsync(
            new Project
            {
                Code = "PRJ-001",
                Name = "Project 1"
            },
            new Project
            {
                Code = "PRJ-002",
                Name = "Project 2"
            });
        await db.SaveChangesAsync();

        var importsService = new SourceDataImportsService(db);
        var created = await importsService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "grouping-source-data.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "PRJ-002",
                    ObjectWbs = "B.01.01",
                    DisciplineCode = "ELEC",
                    ManHours = 5m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 10m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 3,
                    ProjectCode = "PRJ-001",
                    ObjectWbs = "A.01.02",
                    DisciplineCode = "PIPING",
                    ManHours = 20m
                },
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 4,
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "X.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 7m
                }
            ]
        });

        var batch = await db.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstAsync(x => x.Id == created.Id);

        var groupingService = new LotRecommendationGroupingService(db);
        var groups = await groupingService.BuildGroupsAsync(batch, CancellationToken.None);

        Assert.Equal(2, groups.Count);

        var first = groups[0];
        var second = groups[1];

        Assert.Equal("PRJ-001", first.ProjectCode);
        Assert.Equal("PIPING", first.DisciplineCode);
        Assert.Equal(2, first.Items.Count);
        Assert.All(first.Items, x => Assert.NotNull(x.ProjectId));
        Assert.Equal(new[] { 2, 3 }, first.Items.Select(x => x.RowNumber).ToArray());

        Assert.Equal("PRJ-002", second.ProjectCode);
        Assert.Equal("ELEC", second.DisciplineCode);
        Assert.Single(second.Items);
        Assert.NotNull(second.Items[0].ProjectId);
        Assert.Equal(1, second.Items[0].RowNumber);

        Assert.NotEqual(first.SuggestedLotCode, second.SuggestedLotCode);
    }

    [Fact]
    public async Task BuildGroupsAsync_WhenNoValidRows_ShouldReturnEmpty()
    {
        await using var db = TestDbContextFactory.Create();

        var importsService = new SourceDataImportsService(db);
        var created = await importsService.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "grouping-invalid-source-data.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 1,
                    ProjectCode = "UNKNOWN",
                    ObjectWbs = "X.01.01",
                    DisciplineCode = "PIPING",
                    ManHours = 7m
                }
            ]
        });

        var batch = await db.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstAsync(x => x.Id == created.Id);

        var groupingService = new LotRecommendationGroupingService(db);
        var groups = await groupingService.BuildGroupsAsync(batch, CancellationToken.None);

        Assert.Empty(groups);
    }
}
