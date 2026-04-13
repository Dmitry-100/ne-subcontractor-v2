using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;

namespace Subcontractor.Tests.Unit.ReferenceData;

public sealed class ReferenceDataCodePolicyTests
{
    [Fact]
    public void NormalizeTypeCode_ShouldTrimAndUppercase()
    {
        var normalized = ReferenceDataCodePolicy.NormalizeTypeCode(" purchase_type ");

        Assert.Equal("PURCHASE_TYPE", normalized);
    }

    [Fact]
    public void NormalizeItemCode_EmptyValue_ShouldThrowArgumentException()
    {
        var error = Assert.Throws<ArgumentException>(() => ReferenceDataCodePolicy.NormalizeItemCode("  "));

        Assert.Equal("itemCode", error.ParamName);
    }

    [Fact]
    public void NormalizeDisplayName_ShouldTrimAndReturnValue()
    {
        var normalized = ReferenceDataCodePolicy.NormalizeDisplayName(new UpsertReferenceDataItemRequest
        {
            ItemCode = "A",
            DisplayName = " Display ",
            SortOrder = 1,
            IsActive = true
        });

        Assert.Equal("Display", normalized);
    }

    [Fact]
    public void NormalizeDisplayName_EmptyValue_ShouldThrowArgumentException()
    {
        var error = Assert.Throws<ArgumentException>(() =>
            ReferenceDataCodePolicy.NormalizeDisplayName(new UpsertReferenceDataItemRequest
            {
                ItemCode = "A",
                DisplayName = " ",
                SortOrder = 1,
                IsActive = true
            }));

        Assert.Equal("DisplayName", error.ParamName);
    }

    [Fact]
    public void NormalizeDisplayName_NullRequest_ShouldThrowArgumentNullException()
    {
        var error = Assert.Throws<ArgumentNullException>(() => ReferenceDataCodePolicy.NormalizeDisplayName(null!));

        Assert.Equal("request", error.ParamName);
    }
}
