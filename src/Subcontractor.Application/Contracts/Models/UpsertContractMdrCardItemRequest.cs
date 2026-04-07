namespace Subcontractor.Application.Contracts.Models;

public sealed class UpsertContractMdrCardItemRequest
{
    public string Title { get; set; } = string.Empty;
    public DateTime ReportingDate { get; set; }
    public int SortOrder { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyCollection<UpsertContractMdrRowItemRequest> Rows { get; set; }
        = Array.Empty<UpsertContractMdrRowItemRequest>();
}
