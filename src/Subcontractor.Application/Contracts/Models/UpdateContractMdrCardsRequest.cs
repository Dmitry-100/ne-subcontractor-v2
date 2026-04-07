namespace Subcontractor.Application.Contracts.Models;

public sealed class UpdateContractMdrCardsRequest
{
    public IReadOnlyCollection<UpsertContractMdrCardItemRequest> Items { get; set; }
        = Array.Empty<UpsertContractMdrCardItemRequest>();
}
