namespace Subcontractor.Application.Imports.Models;

public sealed class UpsertDisciplineMappingsRequest
{
    public IReadOnlyCollection<UpsertDisciplineMappingItemRequest> Items { get; set; } =
        Array.Empty<UpsertDisciplineMappingItemRequest>();
}

public sealed class UpsertDisciplineMappingItemRequest
{
    public string ProjectDisciplineGroup { get; set; } = string.Empty;
    public string ProjectDisciplineSection { get; set; } = string.Empty;
    public string ProjectDisciplineName { get; set; } = string.Empty;
    public string ResourceDisciplineName { get; set; } = string.Empty;
}

public sealed record DisciplineMappingDto(
    Guid Id,
    string ProjectDisciplineGroup,
    string ProjectDisciplineSection,
    string ProjectDisciplineName,
    string ResourceDisciplineName);

public sealed record UpsertDisciplineMappingsResultDto(
    int TotalItems,
    int CreatedItems,
    int UpdatedItems,
    IReadOnlyList<DisciplineMappingDto> Items);
