using Subcontractor.Application.ContractorRatings;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Tests.Unit.Contractors;

public sealed class ContractorRatingScoringPolicyTests
{
    [Fact]
    public void ResolveWeights_WhenModelWeightsAreMissing_ShouldUseDefaultWeights()
    {
        var model = new ContractorRatingModelVersion();

        var weights = ContractorRatingScoringPolicy.ResolveWeights(model);

        Assert.Equal(5, weights.Count);
        Assert.Equal(1m, weights.Values.Sum());
        Assert.Equal(0.30m, weights[ContractorRatingFactorCode.DeliveryDiscipline]);
        Assert.Equal(0.20m, weights[ContractorRatingFactorCode.CommercialDiscipline]);
        Assert.Equal(0.15m, weights[ContractorRatingFactorCode.ClaimDiscipline]);
        Assert.Equal(0.25m, weights[ContractorRatingFactorCode.ManualExpertEvaluation]);
        Assert.Equal(0.10m, weights[ContractorRatingFactorCode.WorkloadPenalty]);
    }

    [Fact]
    public void ResolveWeights_WhenAllModelWeightsAreZero_ShouldFallbackToDefaultWeights()
    {
        var model = new ContractorRatingModelVersion();
        foreach (var factorCode in ContractorRatingScoringPolicy.DefaultWeights.Keys)
        {
            model.Weights.Add(new ContractorRatingWeight
            {
                FactorCode = factorCode,
                Weight = 0m
            });
        }

        var weights = ContractorRatingScoringPolicy.ResolveWeights(model);

        Assert.Equal(1m, weights.Values.Sum());
        Assert.Equal(0.30m, weights[ContractorRatingFactorCode.DeliveryDiscipline]);
        Assert.Equal(0.20m, weights[ContractorRatingFactorCode.CommercialDiscipline]);
        Assert.Equal(0.15m, weights[ContractorRatingFactorCode.ClaimDiscipline]);
        Assert.Equal(0.25m, weights[ContractorRatingFactorCode.ManualExpertEvaluation]);
        Assert.Equal(0.10m, weights[ContractorRatingFactorCode.WorkloadPenalty]);
    }

    [Fact]
    public void CalculateDeliveryDisciplineScore_ShouldApplyOverdueRatio()
    {
        var score = ContractorRatingScoringPolicy.CalculateDeliveryDisciplineScore(totalMilestones: 10, overdueMilestones: 2);

        Assert.Equal(86m, score);
    }

    [Theory]
    [InlineData(ReliabilityClass.A, 95)]
    [InlineData(ReliabilityClass.B, 80)]
    [InlineData(ReliabilityClass.New, 70)]
    [InlineData(ReliabilityClass.D, 40)]
    public void CalculateClaimDisciplineScore_ShouldMapReliabilityClass(ReliabilityClass reliabilityClass, decimal expectedScore)
    {
        var score = ContractorRatingScoringPolicy.CalculateClaimDisciplineScore(reliabilityClass);

        Assert.Equal(expectedScore, score);
    }

    [Fact]
    public void CalculateFinalScore_AndScoreToRating_ShouldReturnExpectedResult()
    {
        var weights = ContractorRatingScoringPolicy.ResolveWeights(new ContractorRatingModelVersion());

        var finalScore = ContractorRatingScoringPolicy.CalculateFinalScore(
            deliveryDisciplineScore: 95m,
            commercialDisciplineScore: 80m,
            claimDisciplineScore: 70m,
            manualExpertScore: 60m,
            workloadPenaltyScore: 30m,
            weights);

        var rating = ContractorRatingScoringPolicy.ScoreToRating(finalScore);

        Assert.Equal(73m, finalScore);
        Assert.Equal(3.650m, rating);
    }
}
