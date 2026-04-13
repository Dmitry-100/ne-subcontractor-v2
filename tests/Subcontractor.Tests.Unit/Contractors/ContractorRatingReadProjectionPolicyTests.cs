using Subcontractor.Application.ContractorRatings;
using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Tests.Unit.Contractors;

public sealed class ContractorRatingReadProjectionPolicyTests
{
    [Fact]
    public void ToModelDto_ShouldSortWeightsByFactorCode()
    {
        var model = new ContractorRatingModelVersion
        {
            VersionCode = "R-2026-01",
            Name = "Model",
            IsActive = true,
            Notes = "notes"
        };

        model.Weights.Add(new ContractorRatingWeight
        {
            FactorCode = ContractorRatingFactorCode.WorkloadPenalty,
            Weight = 0.1m,
            Notes = "w"
        });
        model.Weights.Add(new ContractorRatingWeight
        {
            FactorCode = ContractorRatingFactorCode.DeliveryDiscipline,
            Weight = 0.3m,
            Notes = "d"
        });

        var dto = ContractorRatingReadProjectionPolicy.ToModelDto(model);

        Assert.Equal("R-2026-01", dto.VersionCode);
        Assert.Equal(2, dto.Weights.Count);
        Assert.Equal(ContractorRatingFactorCode.DeliveryDiscipline, dto.Weights[0].FactorCode);
        Assert.Equal(ContractorRatingFactorCode.WorkloadPenalty, dto.Weights[1].FactorCode);
    }
}
