using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureShortlistApplyPolicyTests
{
    [Theory]
    [InlineData(-1, 1)]
    [InlineData(0, 1)]
    [InlineData(1, 1)]
    [InlineData(7, 7)]
    [InlineData(30, 30)]
    [InlineData(100, 30)]
    public void NormalizeMaxIncluded_ShouldClampToExpectedRange(int input, int expected)
    {
        var normalized = ProcedureShortlistApplyPolicy.NormalizeMaxIncluded(input);

        Assert.Equal(expected, normalized);
    }

    [Fact]
    public void ResolveAdjustmentReason_ShouldReturnTrimmedOrDefaultReason()
    {
        Assert.Equal("Auto shortlist apply", ProcedureShortlistApplyPolicy.ResolveAdjustmentReason(null));
        Assert.Equal("Auto shortlist apply", ProcedureShortlistApplyPolicy.ResolveAdjustmentReason(" "));
        Assert.Equal("Корректировка", ProcedureShortlistApplyPolicy.ResolveAdjustmentReason("  Корректировка "));
    }

    [Fact]
    public void SelectRecommended_ShouldTakeOnlyRecommendedRowsAndRespectLimit()
    {
        var recommendationA = CreateRecommendation(Guid.Parse("11111111-1111-1111-1111-111111111111"), true);
        var recommendationB = CreateRecommendation(Guid.Parse("22222222-2222-2222-2222-222222222222"), false);
        var recommendationC = CreateRecommendation(Guid.Parse("33333333-3333-3333-3333-333333333333"), true);

        var selected = ProcedureShortlistApplyPolicy.SelectRecommended(
            new[] { recommendationA, recommendationB, recommendationC },
            normalizedMaxIncluded: 1);

        var single = Assert.Single(selected);
        Assert.Equal(recommendationA.ContractorId, single.ContractorId);
    }

    [Fact]
    public void BuildUpsertRequest_ShouldMapSelectedRowsToIncludedItemsWithSequentialSortOrder()
    {
        var selected = new[]
        {
            CreateRecommendation(Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), true),
            CreateRecommendation(Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), true)
        };

        var request = ProcedureShortlistApplyPolicy.BuildUpsertRequest(selected, "Auto shortlist apply");

        Assert.Equal("Auto shortlist apply", request.AdjustmentReason);
        Assert.Equal(2, request.Items.Count);
        Assert.Equal(0, request.Items.ElementAt(0).SortOrder);
        Assert.Equal(1, request.Items.ElementAt(1).SortOrder);
        Assert.All(request.Items, x => Assert.True(x.IsIncluded));
        Assert.Equal(selected[0].ContractorId, request.Items.ElementAt(0).ContractorId);
        Assert.Equal(selected[1].ContractorId, request.Items.ElementAt(1).ContractorId);
    }

    private static ProcedureShortlistRecommendationDto CreateRecommendation(Guid contractorId, bool isRecommended)
    {
        return new ProcedureShortlistRecommendationDto(
            contractorId,
            $"Contractor-{contractorId:N}",
            isRecommended,
            null,
            100m,
            ContractorStatus.Active,
            ReliabilityClass.A,
            4.5m,
            55m,
            true,
            Array.Empty<string>(),
            Array.Empty<string>());
    }
}
