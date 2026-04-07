namespace Subcontractor.Application.Contracts.Models;

public sealed class UpdateContractMilestonesRequest
{
    public IReadOnlyCollection<UpsertContractMilestoneItemRequest> Items { get; set; } =
        Array.Empty<UpsertContractMilestoneItemRequest>();
}
