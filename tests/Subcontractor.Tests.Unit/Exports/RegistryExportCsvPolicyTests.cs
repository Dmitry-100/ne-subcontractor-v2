using System.Text;
using Subcontractor.Application.Exports;

namespace Subcontractor.Tests.Unit.Exports;

public sealed class RegistryExportCsvPolicyTests
{
    [Fact]
    public void BuildCsv_ShouldEscapeCommaAndQuotes()
    {
        var file = RegistryExportCsvPolicy.BuildCsv(
            "demo",
            new[] { "ColA", "ColB" },
            new[]
            {
                new[] { "alpha", "Beta, \"Gamma\"" }
            });

        Assert.StartsWith("demo-", file.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.EndsWith(".csv", file.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("text/csv; charset=utf-8", file.ContentType);
        Assert.NotEmpty(file.Content);

        var csvText = Encoding.UTF8.GetString(file.Content).TrimStart('\uFEFF');
        Assert.Contains("ColA,ColB", csvText);
        Assert.Contains("alpha,\"Beta, \"\"Gamma\"\"\"", csvText);
    }

    [Fact]
    public void FormatDecimal_ShouldUseInvariantCultureWithTwoFractionDigitsMax()
    {
        Assert.Equal("15", RegistryExportCsvPolicy.FormatDecimal(15m));
        Assert.Equal("15.5", RegistryExportCsvPolicy.FormatDecimal(15.5m));
        Assert.Equal("15.57", RegistryExportCsvPolicy.FormatDecimal(15.567m));
    }

    [Fact]
    public void FormatGuidAndDate_ShouldReturnExpectedValues()
    {
        var id = Guid.Parse("11111111-2222-3333-4444-555555555555");
        var date = new DateTime(2026, 4, 11, 18, 45, 10, DateTimeKind.Utc);

        Assert.Equal("11111111-2222-3333-4444-555555555555", RegistryExportCsvPolicy.FormatGuid(id));
        Assert.Equal(string.Empty, RegistryExportCsvPolicy.FormatGuid(null));
        Assert.Equal("2026-04-11", RegistryExportCsvPolicy.FormatDate(date));
        Assert.Equal(string.Empty, RegistryExportCsvPolicy.FormatDate(null));
    }
}
