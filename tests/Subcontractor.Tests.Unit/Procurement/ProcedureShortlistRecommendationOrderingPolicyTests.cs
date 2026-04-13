using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureShortlistRecommendationOrderingPolicyTests
{
    [Fact]
    public void BuildRecommendations_ShouldPlaceRecommendedCandidatesFirst()
    {
        var recommended = CreateCandidate(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            "Alpha",
            isRecommended: true,
            score: 120m,
            loadPercent: 30m);
        var notRecommended = CreateCandidate(
            Guid.Parse("22222222-2222-2222-2222-222222222222"),
            "Beta",
            isRecommended: false,
            score: 999m,
            loadPercent: 10m);

        var result = ProcedureShortlistRecommendationOrderingPolicy.BuildRecommendations(
            new[] { notRecommended, recommended });

        Assert.Equal(recommended.ContractorId, result[0].ContractorId);
        Assert.Equal(notRecommended.ContractorId, result[1].ContractorId);
        Assert.Equal(0, result[0].SuggestedSortOrder);
        Assert.Null(result[1].SuggestedSortOrder);
    }

    [Fact]
    public void BuildRecommendations_ShouldApplyScoreLoadAndNameOrderingInsideRecommendedGroup()
    {
        var scoreLeader = CreateCandidate(
            Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "Zulu",
            isRecommended: true,
            score: 130m,
            loadPercent: 80m);
        var lowerLoad = CreateCandidate(
            Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            "bravo",
            isRecommended: true,
            score: 120m,
            loadPercent: 10m);
        var higherLoad = CreateCandidate(
            Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            "Alpha",
            isRecommended: true,
            score: 120m,
            loadPercent: 60m);
        var sameScoreAndLoadNameA = CreateCandidate(
            Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
            "Alpha",
            isRecommended: true,
            score: 120m,
            loadPercent: 60m);

        var result = ProcedureShortlistRecommendationOrderingPolicy.BuildRecommendations(
            new[] { higherLoad, sameScoreAndLoadNameA, scoreLeader, lowerLoad });

        Assert.Equal(
            new[]
            {
                scoreLeader.ContractorId,
                lowerLoad.ContractorId,
                higherLoad.ContractorId,
                sameScoreAndLoadNameA.ContractorId
            },
            result.Select(x => x.ContractorId).ToArray());

        Assert.Equal(new int?[] { 0, 1, 2, 3 }, result.Select(x => x.SuggestedSortOrder).ToArray());
    }

    [Fact]
    public void BuildRecommendations_ShouldIncrementSuggestedSortOrderOnlyForRecommendedRows()
    {
        var firstRecommended = CreateCandidate(
            Guid.Parse("11111111-2222-3333-4444-555555555555"),
            "First",
            isRecommended: true,
            score: 100m,
            loadPercent: 20m);
        var secondRecommended = CreateCandidate(
            Guid.Parse("66666666-7777-8888-9999-aaaaaaaaaaaa"),
            "Second",
            isRecommended: true,
            score: 90m,
            loadPercent: 30m);
        var excluded = CreateCandidate(
            Guid.Parse("bbbbbbbb-cccc-dddd-eeee-ffffffffffff"),
            "Excluded",
            isRecommended: false,
            score: 150m,
            loadPercent: 10m);

        var result = ProcedureShortlistRecommendationOrderingPolicy.BuildRecommendations(
            new[] { excluded, secondRecommended, firstRecommended });

        Assert.Equal(0, result[0].SuggestedSortOrder);
        Assert.Equal(1, result[1].SuggestedSortOrder);
        Assert.Null(result[2].SuggestedSortOrder);
    }

    private static ProcedureShortlistRecommendationCandidateModel CreateCandidate(
        Guid id,
        string contractorName,
        bool isRecommended,
        decimal score,
        decimal loadPercent)
    {
        return new ProcedureShortlistRecommendationCandidateModel(
            id,
            contractorName,
            isRecommended,
            score,
            isRecommended ? ContractorStatus.Active : ContractorStatus.Blocked,
            isRecommended ? ReliabilityClass.A : ReliabilityClass.D,
            4.5m,
            loadPercent,
            true,
            Array.Empty<string>(),
            Array.Empty<string>());
    }
}
