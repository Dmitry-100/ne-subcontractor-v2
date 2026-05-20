using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.ReferenceData;

public sealed class DisciplineMapping : SoftDeletableEntity
{
    public string MappingKey { get; set; } = string.Empty;
    public string ProjectDisciplineGroup { get; set; } = string.Empty;
    public string ProjectDisciplineSection { get; set; } = string.Empty;
    public string ProjectDisciplineName { get; set; } = string.Empty;
    public string ResourceDisciplineName { get; set; } = string.Empty;
}
