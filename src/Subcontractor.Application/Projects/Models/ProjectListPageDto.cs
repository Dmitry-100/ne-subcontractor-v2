namespace Subcontractor.Application.Projects.Models;

public sealed record ProjectListPageDto(
    IReadOnlyList<ProjectListItemDto> Items,
    int TotalCount,
    int Skip,
    int Take);
