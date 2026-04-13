using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Application.ContractorRatings;

internal static class ContractorRatingModelRequestPolicy
{
    internal static string? NormalizeRequiredText(string? value)
    {
        var text = NormalizeOptionalText(value);
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    internal static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    internal static string? NormalizeVersionCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant();
    }

    internal static IReadOnlyDictionary<ContractorRatingFactorCode, NormalizedContractorRatingWeightItem> NormalizeWeights(
        IReadOnlyList<UpsertContractorRatingWeightRequest> requestWeights)
    {
        if (requestWeights.Count == 0)
        {
            return ContractorRatingScoringPolicy.DefaultWeights.ToDictionary(
                x => x.Key,
                x => new NormalizedContractorRatingWeightItem(x.Value, null));
        }

        var normalized = requestWeights
            .GroupBy(x => x.FactorCode)
            .ToDictionary(
                x => x.Key,
                x =>
                {
                    if (x.Count() > 1)
                    {
                        throw new ArgumentException($"Duplicate rating weight factor '{x.Key}'.");
                    }

                    var item = x.Single();
                    if (item.Weight < 0m || item.Weight > 1m)
                    {
                        throw new ArgumentException($"Weight for '{item.FactorCode}' must be in range [0..1].");
                    }

                    return new NormalizedContractorRatingWeightItem(
                        item.Weight,
                        NormalizeOptionalText(item.Notes));
                });

        foreach (var factor in ContractorRatingScoringPolicy.DefaultWeights.Keys)
        {
            if (!normalized.ContainsKey(factor))
            {
                normalized[factor] = new NormalizedContractorRatingWeightItem(
                    ContractorRatingScoringPolicy.DefaultWeights[factor],
                    null);
            }
        }

        var sum = normalized.Values.Sum(x => x.Weight);
        if (sum <= 0m)
        {
            throw new ArgumentException("Rating weight sum must be greater than zero.");
        }

        return normalized.ToDictionary(
            x => x.Key,
            x => new NormalizedContractorRatingWeightItem(
                decimal.Round(x.Value.Weight / sum, 6, MidpointRounding.AwayFromZero),
                x.Value.Notes));
    }
}

internal sealed record NormalizedContractorRatingWeightItem(decimal Weight, string? Notes);
