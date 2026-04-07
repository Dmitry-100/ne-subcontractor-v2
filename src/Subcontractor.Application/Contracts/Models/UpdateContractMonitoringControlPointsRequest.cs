namespace Subcontractor.Application.Contracts.Models;

public sealed class UpdateContractMonitoringControlPointsRequest
{
    public IReadOnlyCollection<UpsertContractMonitoringControlPointItemRequest> Items { get; set; }
        = Array.Empty<UpsertContractMonitoringControlPointItemRequest>();
}
