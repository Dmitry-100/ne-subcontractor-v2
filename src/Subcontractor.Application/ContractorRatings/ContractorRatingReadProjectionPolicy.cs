using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Application.ContractorRatings;

internal static class ContractorRatingReadProjectionPolicy
{
    internal static ContractorRatingModelDto ToModelDto(ContractorRatingModelVersion model)
    {
        var weights = model.Weights
            .OrderBy(x => x.FactorCode)
            .Select(x => new ContractorRatingWeightDto(x.FactorCode, x.Weight, x.Notes))
            .ToArray();

        return new ContractorRatingModelDto(
            model.Id,
            model.VersionCode,
            model.Name,
            model.IsActive,
            model.ActivatedAtUtc,
            model.Notes,
            weights);
    }
}
