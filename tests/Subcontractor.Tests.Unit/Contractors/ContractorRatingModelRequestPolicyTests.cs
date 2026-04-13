using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Tests.Unit.Contractors;

public sealed class ContractorRatingModelRequestPolicyTests
{
    [Fact]
    public void NormalizeVersionCode_ShouldTrimAndUppercase()
    {
        var normalized = ContractorRatingModelRequestPolicy.NormalizeVersionCode("  r-2026-01  ");

        Assert.Equal("R-2026-01", normalized);
    }

    [Fact]
    public void NormalizeOptionalText_AndRequiredText_ShouldReturnNullForWhitespace()
    {
        Assert.Null(ContractorRatingModelRequestPolicy.NormalizeOptionalText("  "));
        Assert.Null(ContractorRatingModelRequestPolicy.NormalizeRequiredText("  "));
        Assert.Equal("note", ContractorRatingModelRequestPolicy.NormalizeOptionalText(" note "));
        Assert.Equal("name", ContractorRatingModelRequestPolicy.NormalizeRequiredText(" name "));
    }

    [Fact]
    public void NormalizeWeights_WhenRequestIsEmpty_ShouldReturnDefaultWeights()
    {
        var weights = ContractorRatingModelRequestPolicy.NormalizeWeights(Array.Empty<UpsertContractorRatingWeightRequest>());

        Assert.Equal(5, weights.Count);
        Assert.Equal(1m, weights.Values.Sum(x => x.Weight));
        Assert.Equal(0.30m, weights[ContractorRatingFactorCode.DeliveryDiscipline].Weight);
        Assert.Equal(0.20m, weights[ContractorRatingFactorCode.CommercialDiscipline].Weight);
        Assert.Equal(0.15m, weights[ContractorRatingFactorCode.ClaimDiscipline].Weight);
        Assert.Equal(0.25m, weights[ContractorRatingFactorCode.ManualExpertEvaluation].Weight);
        Assert.Equal(0.10m, weights[ContractorRatingFactorCode.WorkloadPenalty].Weight);
    }

    [Fact]
    public void NormalizeWeights_WhenFactorDuplicated_ShouldThrow()
    {
        var request = new[]
        {
            new UpsertContractorRatingWeightRequest
            {
                FactorCode = ContractorRatingFactorCode.DeliveryDiscipline,
                Weight = 0.4m
            },
            new UpsertContractorRatingWeightRequest
            {
                FactorCode = ContractorRatingFactorCode.DeliveryDiscipline,
                Weight = 0.6m
            }
        };

        Assert.Throws<ArgumentException>(() => ContractorRatingModelRequestPolicy.NormalizeWeights(request));
    }

    [Fact]
    public void NormalizeWeights_WhenWeightOutOfRange_ShouldThrow()
    {
        var request = new[]
        {
            new UpsertContractorRatingWeightRequest
            {
                FactorCode = ContractorRatingFactorCode.DeliveryDiscipline,
                Weight = 1.2m
            }
        };

        Assert.Throws<ArgumentException>(() => ContractorRatingModelRequestPolicy.NormalizeWeights(request));
    }

    [Fact]
    public void NormalizeWeights_WhenAllFactorsAreZero_ShouldThrow()
    {
        var request = ContractorRatingScoringPolicy.DefaultWeights.Keys
            .Select(factor => new UpsertContractorRatingWeightRequest
            {
                FactorCode = factor,
                Weight = 0m
            })
            .ToArray();

        Assert.Throws<ArgumentException>(() => ContractorRatingModelRequestPolicy.NormalizeWeights(request));
    }

    [Fact]
    public void NormalizeWeights_ShouldFillMissingFactorsAndNormalizeToOne()
    {
        var request = new[]
        {
            new UpsertContractorRatingWeightRequest
            {
                FactorCode = ContractorRatingFactorCode.DeliveryDiscipline,
                Weight = 0.5m,
                Notes = "  custom  "
            }
        };

        var weights = ContractorRatingModelRequestPolicy.NormalizeWeights(request);

        Assert.Equal(5, weights.Count);
        Assert.Equal(1m, weights.Values.Sum(x => x.Weight));
        Assert.Equal("custom", weights[ContractorRatingFactorCode.DeliveryDiscipline].Notes);
        Assert.Equal(0.416667m, weights[ContractorRatingFactorCode.DeliveryDiscipline].Weight);
    }
}
