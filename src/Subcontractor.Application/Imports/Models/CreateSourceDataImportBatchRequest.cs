namespace Subcontractor.Application.Imports.Models;

public sealed class CreateSourceDataImportBatchRequest
{
    public string FileName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public IReadOnlyCollection<CreateSourceDataImportRowRequest> Rows { get; set; } =
        Array.Empty<CreateSourceDataImportRowRequest>();
}
