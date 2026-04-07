using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Application.ContractorRatings.Models;

public sealed class UpsertContractorRatingWeightRequest
{
    public ContractorRatingFactorCode FactorCode { get; set; }
    public decimal Weight { get; set; }
    public string? Notes { get; set; }
}

