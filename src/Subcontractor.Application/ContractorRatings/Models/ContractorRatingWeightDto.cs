using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Application.ContractorRatings.Models;

public sealed record ContractorRatingWeightDto(
    ContractorRatingFactorCode FactorCode,
    decimal Weight,
    string? Notes);

