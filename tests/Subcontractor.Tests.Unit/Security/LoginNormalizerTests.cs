using Subcontractor.Application.Security;

namespace Subcontractor.Tests.Unit.Security;

public sealed class LoginNormalizerTests
{
    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("   ", "")]
    [InlineData("DOMAIN\\User", "user")]
    [InlineData("user@company.local", "user")]
    [InlineData(" DOMAIN\\User@company.local ", "user")]
    [InlineData("SimpleLogin", "simplelogin")]
    public void Normalize_Should_ReturnExpectedValue(string? rawLogin, string expected)
    {
        var normalized = LoginNormalizer.Normalize(rawLogin);
        Assert.Equal(expected, normalized);
    }
}
