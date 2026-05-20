namespace Subcontractor.Application.Imports.Models;

public sealed class ApplyDisciplineResolutionsRequest
{
    public IReadOnlyList<ApplyDisciplineResolutionItemRequest> Items { get; set; } =
        Array.Empty<ApplyDisciplineResolutionItemRequest>();
}

public sealed class ApplyDisciplineResolutionItemRequest
{
    public Guid RowId { get; set; }
    public string ProjectDisciplineName { get; set; } = string.Empty;
}
