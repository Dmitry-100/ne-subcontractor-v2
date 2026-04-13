using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Tests.Unit.Contractors;

public sealed class ContractorPoliciesTests
{
    [Fact]
    public void EnsureCreateRequestValid_EmptyInn_ShouldThrow()
    {
        var error = Assert.Throws<ArgumentException>(() => ContractorRequestPolicy.EnsureCreateRequestValid(
            new CreateContractorRequest
            {
                Inn = " ",
                Name = "Valid"
            }));

        Assert.Equal("Inn", error.ParamName);
    }

    [Fact]
    public void EnsureUpdateRequestValid_NegativeCapacity_ShouldThrow()
    {
        var error = Assert.Throws<ArgumentException>(() => ContractorRequestPolicy.EnsureUpdateRequestValid(
            new UpdateContractorRequest
            {
                Name = "Valid",
                CapacityHours = -1m
            }));

        Assert.Equal("CapacityHours", error.ParamName);
    }

    [Fact]
    public void NormalizeDisciplineCodes_ShouldTrimUppercaseAndDeduplicate()
    {
        var result = ContractorRequestPolicy.NormalizeDisciplineCodes([" piping ", "PIPING", " elec ", " "]);

        Assert.Equal(["PIPING", "ELEC"], result);
    }

    [Fact]
    public void CalculateLoadPercent_ZeroCapacityAndPositiveLoad_ShouldReturnHundred()
    {
        var result = ContractorLoadCalculationPolicy.CalculateLoadPercent(5m, 0m);

        Assert.Equal(100m, result);
    }

    [Fact]
    public void CalculateLoadPercent_ShouldRoundAwayFromZero()
    {
        var result = ContractorLoadCalculationPolicy.CalculateLoadPercent(1m, 3m);

        Assert.Equal(33.33m, result);
    }

    [Fact]
    public void ToDetailsDto_ShouldSortDisciplineCodes()
    {
        var contractor = new Contractor
        {
            Inn = "7700000001",
            Name = "Contractor",
            City = "Moscow",
            ContactName = "Contact",
            Phone = "+70000000001",
            Email = "contractor@test.local",
            CapacityHours = 100m,
            CurrentRating = 4m,
            CurrentLoadPercent = 20m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active,
            Qualifications =
            [
                new ContractorQualification { DisciplineCode = "PIPING" },
                new ContractorQualification { DisciplineCode = "ARCH" },
                new ContractorQualification { DisciplineCode = "ELEC" }
            ]
        };

        var result = ContractorReadProjectionPolicy.ToDetailsDto(contractor);

        Assert.Equal(["ARCH", "ELEC", "PIPING"], result.DisciplineCodes);
    }
}
