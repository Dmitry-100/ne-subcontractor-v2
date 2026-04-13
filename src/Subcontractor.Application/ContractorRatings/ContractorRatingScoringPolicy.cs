using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.ContractorRatings;

internal static class ContractorRatingScoringPolicy
{
    internal static readonly IReadOnlyDictionary<ContractorRatingFactorCode, decimal> DefaultWeights =
        new Dictionary<ContractorRatingFactorCode, decimal>
        {
            [ContractorRatingFactorCode.DeliveryDiscipline] = 0.30m,
            [ContractorRatingFactorCode.CommercialDiscipline] = 0.20m,
            [ContractorRatingFactorCode.ClaimDiscipline] = 0.15m,
            [ContractorRatingFactorCode.ManualExpertEvaluation] = 0.25m,
            [ContractorRatingFactorCode.WorkloadPenalty] = 0.10m
        };

    internal static Dictionary<ContractorRatingFactorCode, decimal> ResolveWeights(ContractorRatingModelVersion model)
    {
        var result = DefaultWeights.ToDictionary(x => x.Key, x => x.Value);
        foreach (var weight in model.Weights)
        {
            result[weight.FactorCode] = weight.Weight;
        }

        var sum = result.Values.Sum();
        if (sum <= 0m)
        {
            return DefaultWeights.ToDictionary(x => x.Key, x => x.Value);
        }

        return result.ToDictionary(
            x => x.Key,
            x => decimal.Round(x.Value / sum, 6, MidpointRounding.AwayFromZero));
    }

    internal static decimal CalculateDeliveryDisciplineScore(int totalMilestones, int overdueMilestones)
    {
        if (totalMilestones <= 0)
        {
            return 75m;
        }

        var overdueRatio = (decimal)overdueMilestones / totalMilestones;
        var score = 100m - overdueRatio * 70m;
        return ClampPercent(score);
    }

    internal static decimal CalculateCommercialDisciplineScore(int totalContracts, int closedContracts)
    {
        if (totalContracts <= 0)
        {
            return 70m;
        }

        var ratio = (decimal)closedContracts / totalContracts;
        return ClampPercent(60m + ratio * 40m);
    }

    internal static decimal CalculateClaimDisciplineScore(ReliabilityClass reliabilityClass)
    {
        return reliabilityClass switch
        {
            ReliabilityClass.A => 95m,
            ReliabilityClass.B => 80m,
            ReliabilityClass.New => 70m,
            ReliabilityClass.D => 40m,
            _ => 70m
        };
    }

    internal static decimal CalculateManualExpertScore(decimal currentRating, decimal? manualAssessmentScore)
    {
        if (manualAssessmentScore.HasValue)
        {
            return ClampPercent(manualAssessmentScore.Value * 20m);
        }

        return ClampPercent(currentRating * 20m);
    }

    internal static decimal CalculateWorkloadPenaltyScore(decimal currentLoadPercent)
    {
        if (currentLoadPercent <= 80m)
        {
            return 100m;
        }

        if (currentLoadPercent <= 100m)
        {
            return 85m;
        }

        if (currentLoadPercent <= 120m)
        {
            return 60m;
        }

        return 30m;
    }

    internal static decimal CalculateFinalScore(
        decimal deliveryDisciplineScore,
        decimal commercialDisciplineScore,
        decimal claimDisciplineScore,
        decimal manualExpertScore,
        decimal workloadPenaltyScore,
        IReadOnlyDictionary<ContractorRatingFactorCode, decimal> weights)
    {
        return decimal.Round(
            deliveryDisciplineScore * weights.GetValueOrDefault(ContractorRatingFactorCode.DeliveryDiscipline) +
            commercialDisciplineScore * weights.GetValueOrDefault(ContractorRatingFactorCode.CommercialDiscipline) +
            claimDisciplineScore * weights.GetValueOrDefault(ContractorRatingFactorCode.ClaimDiscipline) +
            manualExpertScore * weights.GetValueOrDefault(ContractorRatingFactorCode.ManualExpertEvaluation) +
            workloadPenaltyScore * weights.GetValueOrDefault(ContractorRatingFactorCode.WorkloadPenalty),
            3,
            MidpointRounding.AwayFromZero);
    }

    internal static decimal ScoreToRating(decimal scorePercent)
    {
        return decimal.Round(ClampPercent(scorePercent) / 20m, 3, MidpointRounding.AwayFromZero);
    }

    internal static decimal ClampPercent(decimal value)
    {
        if (value < 0m)
        {
            return 0m;
        }

        return value > 100m ? 100m : decimal.Round(value, 3, MidpointRounding.AwayFromZero);
    }
}
