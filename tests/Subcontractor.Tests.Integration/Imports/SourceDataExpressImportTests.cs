using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class SourceDataExpressImportTests
{
    [Fact]
    public async Task CreateBatchAsync_WithExpressRows_ShouldCreateMissingProjectsAndResolveUniqueDiscipline()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<DisciplineMapping>().AddAsync(new DisciplineMapping
        {
            MappingKey = DisciplineMappingPolicy.BuildMappingKey(
                "01.6 Отдел технологического проектирования (механики)",
                "Технологическая компоновка и обвязка промышленных объектов"),
            ProjectDisciplineGroup = "Технологические решения",
            ProjectDisciplineSection = "Технологические решения",
            ProjectDisciplineName = "Технологическая компоновка и обвязка промышленных объектов",
            ResourceDisciplineName = "01.6 Отдел технологического проектирования (механики)"
        });
        await db.SaveChangesAsync();

        var service = new SourceDataImportWriteWorkflowService(db);

        var result = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "20260423-Модуль. Субподрядчик.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = 2,
                    ProjectCode = "25-089",
                    ComplexProjectName = "AA",
                    ProjectName = "ЦХПП",
                    ObjectWbs = "1",
                    ResourceDisciplineName = "01.6 Отдел технологического проектирования (механики)",
                    BranchOfficeName = "Екатеринбург",
                    GipName = "Иванов Иван Иванович",
                    ManHours = 635.2m,
                    PlannedStartDate = new DateTime(2026, 3, 30),
                    PlannedFinishDate = new DateTime(2026, 6, 1)
                }
            ]
        });

        Assert.Equal(1, result.ValidRows);
        Assert.Equal("ЦХПП", result.Rows[0].ProjectName);
        Assert.Equal("AA", result.Rows[0].ComplexProjectName);
        Assert.Equal(
            "Технологическая компоновка и обвязка промышленных объектов",
            result.Rows[0].DisciplineCode);
        Assert.Equal(
            "01.6 Отдел технологического проектирования (механики)",
            result.Rows[0].ResourceDisciplineName);

        var importedProject = await db.Projects.SingleAsync(x => x.Code == "25-089");
        Assert.Equal("ЦХПП", importedProject.Name);
    }

    [Fact]
    public async Task CreateBatchAsync_WithAmbiguousResourceDiscipline_ShouldRequireProjectDisciplineSelection()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<DisciplineMapping>().AddRangeAsync(
            new DisciplineMapping
            {
                MappingKey = DisciplineMappingPolicy.BuildMappingKey("07.1 Отдел систем автоматизации", "АСУ ТП"),
                ProjectDisciplineGroup = "Автоматизация",
                ProjectDisciplineSection = "Автоматизация",
                ProjectDisciplineName = "АСУ ТП",
                ResourceDisciplineName = "07.1 Отдел систем автоматизации"
            },
            new DisciplineMapping
            {
                MappingKey = DisciplineMappingPolicy.BuildMappingKey("07.1 Отдел систем автоматизации", "Системы связи"),
                ProjectDisciplineGroup = "Автоматизация",
                ProjectDisciplineSection = "Связь",
                ProjectDisciplineName = "Системы связи",
                ResourceDisciplineName = "07.1 Отдел систем автоматизации"
            });
        await db.SaveChangesAsync();

        var service = new SourceDataImportWriteWorkflowService(db);

        var result = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "express.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "24-242",
                    ProjectName = "ДЦ-1",
                    ObjectWbs = "1",
                    ResourceDisciplineName = "07.1 Отдел систем автоматизации",
                    ManHours = 10.4m
                }
            ]
        });

        Assert.Equal(0, result.ValidRows);
        Assert.Equal(1, result.InvalidRows);
        Assert.Contains("выберите проектную дисциплину", result.Rows[0].ValidationMessage);
    }

    [Fact]
    public async Task ApplyDisciplineResolutionsAsync_WithAllowedProjectDiscipline_ShouldValidateRowAndRecalculateBatch()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<DisciplineMapping>().AddRangeAsync(
            new DisciplineMapping
            {
                MappingKey = DisciplineMappingPolicy.BuildMappingKey("07.1 Отдел систем автоматизации", "АСУ ТП"),
                ProjectDisciplineGroup = "Автоматизация",
                ProjectDisciplineSection = "Автоматизация",
                ProjectDisciplineName = "АСУ ТП",
                ResourceDisciplineName = "07.1 Отдел систем автоматизации"
            },
            new DisciplineMapping
            {
                MappingKey = DisciplineMappingPolicy.BuildMappingKey("07.1 Отдел систем автоматизации", "Системы связи"),
                ProjectDisciplineGroup = "Автоматизация",
                ProjectDisciplineSection = "Связь",
                ProjectDisciplineName = "Системы связи",
                ResourceDisciplineName = "07.1 Отдел систем автоматизации"
            });
        await db.SaveChangesAsync();

        var service = new SourceDataImportsService(db);
        var created = await service.CreateBatchAsync(new CreateSourceDataImportBatchRequest
        {
            FileName = "express.xlsx",
            Rows =
            [
                new CreateSourceDataImportRowRequest
                {
                    ProjectCode = "24-242",
                    ProjectName = "ДЦ-1",
                    ComplexProjectName = "КХП",
                    ObjectWbs = "1",
                    ResourceDisciplineName = "07.1 Отдел систем автоматизации",
                    ManHours = 10.4m
                }
            ]
        });
        var row = Assert.Single(created.Rows);
        Assert.False(row.IsValid);

        var resolved = await service.ApplyDisciplineResolutionsAsync(created.Id, new ApplyDisciplineResolutionsRequest
        {
            Items =
            [
                new ApplyDisciplineResolutionItemRequest
                {
                    RowId = row.Id,
                    ProjectDisciplineName = "АСУ ТП"
                }
            ]
        });

        Assert.NotNull(resolved);
        Assert.Equal(SourceDataImportBatchStatus.Validated, resolved!.Status);
        Assert.Equal(1, resolved.ValidRows);
        Assert.Equal(0, resolved.InvalidRows);
        var resolvedRow = Assert.Single(resolved.Rows);
        Assert.True(resolvedRow.IsValid);
        Assert.Equal("АСУ ТП", resolvedRow.DisciplineCode);
        Assert.Equal("КХП", resolvedRow.ComplexProjectName);
        Assert.Null(resolvedRow.ValidationMessage);
    }
}
