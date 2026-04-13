using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureShortlistRecommendationPolicyTests
{
    [Fact]
    public void CalculateLoadPercent_WithZeroCapacity_ShouldReturnExpectedBoundaryValues()
    {
        var noLoad = ProcedureShortlistRecommendationPolicy.CalculateLoadPercent(0m, 0m);
        var hasLoad = ProcedureShortlistRecommendationPolicy.CalculateLoadPercent(12m, 0m);

        Assert.Equal(0m, noLoad);
        Assert.Equal(100m, hasLoad);
    }

    [Fact]
    public void CalculateRecommendationScore_WithRecommendedContractor_ShouldReturnExpectedScore()
    {
        var contractor = new Contractor
        {
            Inn = "7700000001",
            Name = "Policy Contractor",
            City = "Moscow",
            ContactName = "Policy Contractor",
            Phone = "+70000000000",
            Email = "policy.contractor@example.local",
            CapacityHours = 100m,
            CurrentRating = 4.5m,
            CurrentLoadPercent = 80m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };

        var score = ProcedureShortlistRecommendationPolicy.CalculateRecommendationScore(
            contractor,
            hasRequiredQualifications: true,
            hasAnyQualificationMatch: true);

        Assert.Equal(120m, score);
    }

    [Fact]
    public void BuildDecisionFactors_WithBlockedAndOverloadedContractor_ShouldContainExplanations()
    {
        var contractor = new Contractor
        {
            Inn = "7700000002",
            Name = "Blocked Contractor",
            City = "Moscow",
            ContactName = "Blocked Contractor",
            Phone = "+70000000001",
            Email = "blocked.contractor@example.local",
            CapacityHours = 100m,
            CurrentRating = 3.2m,
            CurrentLoadPercent = 132.5m,
            ReliabilityClass = ReliabilityClass.D,
            Status = ContractorStatus.Blocked
        };

        var factors = ProcedureShortlistRecommendationPolicy.BuildDecisionFactors(
            contractor,
            hasRequiredQualifications: false,
            hasAnyQualificationMatch: false,
            missingDisciplines: ["ELEC", "PIPING"],
            isRecommended: false);

        Assert.Contains(factors, x => x.Contains("Подрядчик не активен", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(factors, x => x.Contains("Класс надежности D", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(factors, x => x.Contains("Не хватает квалификаций", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(factors, x => x.Contains("Загрузка превышает 100%", StringComparison.OrdinalIgnoreCase));
    }
}
