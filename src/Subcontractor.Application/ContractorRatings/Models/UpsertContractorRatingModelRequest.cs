namespace Subcontractor.Application.ContractorRatings.Models;

public sealed class UpsertContractorRatingModelRequest
{
    public string? VersionCode { get; set; }
    public string? Name { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyList<UpsertContractorRatingWeightRequest> Weights { get; set; } =
        Array.Empty<UpsertContractorRatingWeightRequest>();
}

