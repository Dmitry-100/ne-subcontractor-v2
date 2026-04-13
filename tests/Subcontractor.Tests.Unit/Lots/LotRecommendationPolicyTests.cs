using Subcontractor.Application.Lots;

namespace Subcontractor.Tests.Unit.Lots;

public sealed class LotRecommendationPolicyTests
{
    [Fact]
    public void BuildGroupKey_ShouldComposeProjectAndDiscipline()
    {
        var result = LotRecommendationPolicy.BuildGroupKey("PRJ-001", "PIPING");

        Assert.Equal("PRJ-001|PIPING", result);
    }

    [Fact]
    public void BuildSuggestedLotCode_ShouldNormalizeTokensAndRespectLimit()
    {
        var result = LotRecommendationPolicy.BuildSuggestedLotCode(" prj 001 ", " piping/main ", 3);

        Assert.Equal("LOT-PRJ-001-PIPING-MAIN-03", result);
    }

    [Fact]
    public void EnsureUniqueSuggestedCode_WhenDuplicate_ShouldAppendSuffix()
    {
        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "LOT-PRJ-001-PIPING-01"
        };

        var result = LotRecommendationPolicy.EnsureUniqueSuggestedCode("LOT-PRJ-001-PIPING-01", used);

        Assert.Equal("LOT-PRJ-001-PIPING-01-02", result);
    }

    [Fact]
    public void BuildSuggestedLotName_ShouldTrimByMaxLength()
    {
        var projectCode = new string('P', 300);
        var disciplineCode = new string('D', 300);

        var result = LotRecommendationPolicy.BuildSuggestedLotName(projectCode, disciplineCode, 7);

        Assert.Equal(512, result.Length);
        Assert.StartsWith(projectCode, result, StringComparison.Ordinal);
    }

    [Fact]
    public void NormalizeLotCode_ShouldUseFallbackAndUppercaseRequestedValue()
    {
        var fromFallback = LotRecommendationPolicy.NormalizeLotCode(null, "lot-001");
        var fromRequested = LotRecommendationPolicy.NormalizeLotCode("  lot-custom  ", "ignored");

        Assert.Equal("lot-001", fromFallback);
        Assert.Equal("LOT-CUSTOM", fromRequested);
    }

    [Fact]
    public void NormalizeLotCode_WhenRequestedAndFallbackEmpty_ShouldThrow()
    {
        var error = Assert.Throws<ArgumentException>(() => LotRecommendationPolicy.NormalizeLotCode(" ", " "));

        Assert.Equal("requestedCode", error.ParamName);
    }

    [Fact]
    public void NormalizeLotName_ShouldUseFallbackTrimRequestedAndRespectLimit()
    {
        var fromFallback = LotRecommendationPolicy.NormalizeLotName(null, "Default lot");
        var fromRequested = LotRecommendationPolicy.NormalizeLotName("  Custom lot  ", "ignored");
        var longName = LotRecommendationPolicy.NormalizeLotName(new string('N', 700), "ignored");

        Assert.Equal("Default lot", fromFallback);
        Assert.Equal("Custom lot", fromRequested);
        Assert.Equal(512, longName.Length);
    }

    [Fact]
    public void NormalizeLotName_WhenRequestedAndFallbackEmpty_ShouldThrow()
    {
        var error = Assert.Throws<ArgumentException>(() => LotRecommendationPolicy.NormalizeLotName(" ", " "));

        Assert.Equal("requestedName", error.ParamName);
    }
}
