using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Tests.Unit.Imports;

public sealed class DisciplineMappingPolicyTests
{
    [Fact]
    public void NormalizeItems_ShouldTrimRowsAndBuildDeterministicKeys()
    {
        var items = DisciplineMappingPolicy.NormalizeItems([
            new UpsertDisciplineMappingItemRequest
            {
                ProjectDisciplineGroup = "  Общеинженерное проектирование  ",
                ProjectDisciplineSection = "  Общеинженерное проектирование  ",
                ProjectDisciplineName = "  Внутриплощадочные работы  ",
                ResourceDisciplineName = "  06.1 Отдел проектирования генпланов  "
            }
        ]);

        Assert.Single(items);
        Assert.Equal("Общеинженерное проектирование", items[0].ProjectDisciplineGroup);
        Assert.Equal("Внутриплощадочные работы", items[0].ProjectDisciplineName);
        Assert.Equal("06.1 Отдел проектирования генпланов", items[0].ResourceDisciplineName);
        Assert.Equal(64, items[0].MappingKey.Length);
    }

    [Fact]
    public void ResolveProjectDiscipline_ShouldAutoResolveOnlyUniqueResourceMapping()
    {
        var unique = DisciplineMappingPolicy.ResolveProjectDiscipline(
            currentProjectDiscipline: "",
            resourceDisciplineName: "01.6 Отдел технологического проектирования (механики)",
            mappingsByResource: new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["01.6 Отдел технологического проектирования (механики)"] =
                    ["Технологическая компоновка и обвязка промышленных объектов"]
            });

        Assert.Equal("Технологическая компоновка и обвязка промышленных объектов", unique.ProjectDisciplineName);
        Assert.Null(unique.ErrorMessage);

        var ambiguous = DisciplineMappingPolicy.ResolveProjectDiscipline(
            currentProjectDiscipline: "",
            resourceDisciplineName: "07.1 Отдел систем автоматизации",
            mappingsByResource: new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["07.1 Отдел систем автоматизации"] = ["АСУ ТП", "Системы связи"]
            });

        Assert.Equal("", ambiguous.ProjectDisciplineName);
        Assert.Contains("выберите проектную дисциплину", ambiguous.ErrorMessage);
    }
}
