using Subcontractor.Application.Projects;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Projects;

public sealed class ProjectReadQueryServiceTests
{
    [Fact]
    public async Task ListAsync_ScopedUser_ShouldReturnOnlyOwnProjects()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("read-scope-user");
        var otherUser = CreateUser("read-other-user");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        await db.Set<Project>().AddRangeAsync(
            new Project { Code = "PRJ-R-001", Name = "Own", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-R-002", Name = "Other", GipUserId = otherUser.Id });
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("read-scope-user"));
        var service = new ProjectReadQueryService(db, scopeResolver);

        var result = await service.ListAsync(null);

        var item = Assert.Single(result);
        Assert.Equal("PRJ-R-001", item.Code);
        Assert.Equal(currentUser.Id, item.GipUserId);
    }

    [Fact]
    public async Task GetByIdAsync_ProjectOutOfScope_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("read-by-id-user");
        var otherUser = CreateUser("read-by-id-other");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        var outOfScopeProject = new Project
        {
            Code = "PRJ-R-003",
            Name = "Other project",
            GipUserId = otherUser.Id
        };
        await db.Set<Project>().AddAsync(outOfScopeProject);
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("read-by-id-user"));
        var service = new ProjectReadQueryService(db, scopeResolver);

        var result = await service.GetByIdAsync(outOfScopeProject.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task ListPageAsync_ShouldReturnPageAndTotalCountWithinScope()
    {
        await using var db = TestDbContextFactory.Create();
        var currentUser = CreateUser("read-page-user");
        var otherUser = CreateUser("read-page-other");

        await db.Set<AppUser>().AddRangeAsync(currentUser, otherUser);
        await db.Set<Project>().AddRangeAsync(
            new Project { Code = "PRJ-P-001", Name = "Own 1", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-002", Name = "Own 2", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-003", Name = "Own 3", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-004", Name = "Own 4", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-005", Name = "Own 5", GipUserId = currentUser.Id },
            new Project { Code = "PRJ-P-999", Name = "Other", GipUserId = otherUser.Id });
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("read-page-user"));
        var service = new ProjectReadQueryService(db, scopeResolver);

        var result = await service.ListPageAsync(null, skip: 1, take: 2);

        Assert.Equal(5, result.TotalCount);
        Assert.Equal(1, result.Skip);
        Assert.Equal(2, result.Take);
        Assert.Collection(result.Items,
            x => Assert.Equal("PRJ-P-002", x.Code),
            x => Assert.Equal("PRJ-P-003", x.Code));
    }

    [Fact]
    public async Task ListLatestSourceDataPageAsync_ShouldReturnLatestExpressRowsWithImportedExcelShape()
    {
        await using var db = TestDbContextFactory.Create();
        var olderBatch = new SourceDataImportBatch
        {
            FileName = "older.xlsx",
            Status = SourceDataImportBatchStatus.Validated,
            TotalRows = 1,
            ValidRows = 1,
            InvalidRows = 0
        };
        olderBatch.Rows.Add(new SourceDataImportRow
        {
            RowNumber = 2,
            ProjectCode = "OLD-001",
            ProjectName = "Старый проект",
            ComplexProjectName = "OLD",
            ObjectWbs = "1",
            DisciplineCode = "Old discipline",
            ResourceDisciplineName = "Old resource",
            BranchOfficeName = "Липецк",
            GipName = "Старый ГИП",
            ManHours = 1m,
            PlannedStartDate = new DateTime(2026, 1, 1),
            PlannedFinishDate = new DateTime(2026, 1, 2),
            IsValid = true
        });

        var latestBatch = new SourceDataImportBatch
        {
            FileName = "20260423-Модуль. Субподрядчик.xlsx",
            Status = SourceDataImportBatchStatus.ValidatedWithErrors,
            TotalRows = 2,
            ValidRows = 1,
            InvalidRows = 1
        };
        latestBatch.Rows.Add(new SourceDataImportRow
        {
            RowNumber = 2,
            ProjectCode = "25-089",
            ProjectName = "ЦХПП",
            ComplexProjectName = "AA",
            ObjectWbs = "1",
            DisciplineCode = "Технологическая компоновка и обвязка промышленных объектов",
            ResourceDisciplineName = "01.6 Отдел технологического проектирования (механики)",
            BranchOfficeName = "Екатеринбург",
            GipName = "Иванов Иван Иванович",
            ManHours = 635.2m,
            PlannedStartDate = new DateTime(2026, 3, 30),
            PlannedFinishDate = new DateTime(2026, 6, 1),
            IsValid = true
        });
        latestBatch.Rows.Add(new SourceDataImportRow
        {
            RowNumber = 3,
            ProjectCode = "24-242",
            ProjectName = "ДЦ-1",
            ComplexProjectName = "BB",
            ObjectWbs = "1",
            DisciplineCode = "Технологическая компоновка и обвязка промышленных объектов",
            ResourceDisciplineName = "01.6 Отдел технологического проектирования (механики)",
            BranchOfficeName = "Липецк",
            GipName = "Иванов Иван Иванович",
            ManHours = 10.4m,
            PlannedStartDate = new DateTime(2026, 3, 30),
            PlannedFinishDate = new DateTime(2026, 3, 30),
            IsValid = false,
            ValidationMessage = "Проверка"
        });

        await db.Set<SourceDataImportBatch>().AddAsync(olderBatch);
        await db.SaveChangesAsync();
        olderBatch.CreatedAtUtc = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        await db.SaveChangesAsync();

        await db.Set<SourceDataImportBatch>().AddAsync(latestBatch);
        await db.SaveChangesAsync();

        var scopeResolver = new ProjectScopeResolverService(db, new TestCurrentUserService("system"));
        var service = new ProjectReadQueryService(db, scopeResolver);

        var result = await service.ListLatestSourceDataPageAsync(search: null, skip: 0, take: 10);

        Assert.Equal(latestBatch.Id, result.BatchId);
        Assert.Equal("20260423-Модуль. Субподрядчик.xlsx", result.BatchFileName);
        Assert.Equal(SourceDataImportBatchStatus.ValidatedWithErrors, result.BatchStatus);
        Assert.Equal(2, result.TotalCount);
        Assert.Collection(result.Items,
            row =>
            {
                Assert.Equal("25-089", row.ProjectCode);
                Assert.Equal("AA", row.ComplexProjectName);
                Assert.Equal("ЦХПП", row.ProjectName);
                Assert.Equal("1", row.ObjectWbs);
                Assert.Equal("01.6 Отдел технологического проектирования (механики)", row.ResourceDisciplineName);
                Assert.Equal("Екатеринбург", row.BranchOfficeName);
                Assert.Equal("Иванов Иван Иванович", row.GipName);
                Assert.Equal(635.2m, row.ManHours);
                Assert.Equal(new DateTime(2026, 3, 30), row.PlannedStartDate);
                Assert.Equal(new DateTime(2026, 6, 1), row.PlannedFinishDate);
            },
            row => Assert.Equal("24-242", row.ProjectCode));
    }

    private static AppUser CreateUser(string login)
    {
        return new AppUser
        {
            ExternalId = $"ext-{login}",
            Login = login,
            DisplayName = login,
            Email = $"{login}@example.com",
            IsActive = true
        };
    }
}
