using Subcontractor.Application.Sla;
using Subcontractor.Application.Sla.Models;

namespace Subcontractor.Tests.Unit.Sla;

public sealed class SlaRuleConfigurationPolicyTests
{
    [Fact]
    public void NormalizeRuleItems_ShouldNormalizeCodesAndDescription()
    {
        var items = new[]
        {
            new UpsertSlaRuleItemRequest
            {
                PurchaseTypeCode = "  ep  ",
                WarningDaysBeforeDue = 3,
                IsActive = true,
                Description = "  first  "
            },
            new UpsertSlaRuleItemRequest
            {
                PurchaseTypeCode = "kp",
                WarningDaysBeforeDue = 1,
                IsActive = false,
                Description = null
            }
        };

        var normalized = SlaRuleConfigurationPolicy.NormalizeRuleItems(items);

        Assert.Equal(2, normalized.Count);
        Assert.Contains(normalized, x => x.PurchaseTypeCode == "EP" && x.WarningDaysBeforeDue == 3 && x.Description == "first");
        Assert.Contains(normalized, x => x.PurchaseTypeCode == "KP" && x.WarningDaysBeforeDue == 1 && x.Description is null);
    }

    [Fact]
    public void NormalizeRuleItems_WhenDuplicateCode_ShouldThrow()
    {
        var items = new[]
        {
            new UpsertSlaRuleItemRequest { PurchaseTypeCode = "EP", WarningDaysBeforeDue = 2 },
            new UpsertSlaRuleItemRequest { PurchaseTypeCode = "ep", WarningDaysBeforeDue = 3 }
        };

        Assert.Throws<ArgumentException>(() => SlaRuleConfigurationPolicy.NormalizeRuleItems(items));
    }

    [Fact]
    public void NormalizeRuleItems_WhenCodeIsEmpty_ShouldThrow()
    {
        var items = new[]
        {
            new UpsertSlaRuleItemRequest { PurchaseTypeCode = "   ", WarningDaysBeforeDue = 2 }
        };

        Assert.Throws<ArgumentException>(() => SlaRuleConfigurationPolicy.NormalizeRuleItems(items));
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(30, 30)]
    public void NormalizeWarningDays_WithValidValues_ShouldReturnSame(int value, int expected)
    {
        var normalized = SlaRuleConfigurationPolicy.NormalizeWarningDays(value);

        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(31)]
    public void NormalizeWarningDays_WithOutOfRange_ShouldThrow(int value)
    {
        Assert.Throws<ArgumentException>(() => SlaRuleConfigurationPolicy.NormalizeWarningDays(value));
    }

    [Fact]
    public void ResolveWarningDays_ShouldUseMapValueOrDefault()
    {
        var byPurchaseType = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["EP"] = 5
        };

        var mapped = SlaRuleConfigurationPolicy.ResolveWarningDays("ep", byPurchaseType, defaultWarningDaysBeforeDue: 2);
        var fallback = SlaRuleConfigurationPolicy.ResolveWarningDays("KP", byPurchaseType, defaultWarningDaysBeforeDue: 2);

        Assert.Equal(5, mapped);
        Assert.Equal(2, fallback);
    }

    [Fact]
    public void NormalizeNullableCodeAndText_ShouldTrimAndHandleWhitespace()
    {
        Assert.Equal("ABC", SlaRuleConfigurationPolicy.NormalizeNullableCode("  abc  "));
        Assert.Null(SlaRuleConfigurationPolicy.NormalizeNullableCode(" "));
        Assert.Equal("text", SlaRuleConfigurationPolicy.NormalizeNullableText(" text "));
        Assert.Null(SlaRuleConfigurationPolicy.NormalizeNullableText(" "));
    }
}
