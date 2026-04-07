namespace Subcontractor.Application.Contracts.Models;

public sealed class ImportContractMdrForecastFactRequest
{
    public bool SkipConflicts { get; set; }
    public IReadOnlyCollection<ImportContractMdrForecastFactItemRequest> Items { get; set; }
        = Array.Empty<ImportContractMdrForecastFactItemRequest>();
}
