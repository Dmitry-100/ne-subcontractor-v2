using Subcontractor.DbMigrator;

namespace Subcontractor.Tests.Unit.Migrations;

public sealed class MigratorExecutionOptionsTests
{
    [Fact]
    public void Parse_WithoutArgs_ShouldUseDefaultFlags()
    {
        var options = MigratorExecutionOptions.Parse(Array.Empty<string>());

        Assert.False(options.DryRun);
        Assert.False(options.SkipSeed);
        Assert.False(options.ShowHelp);
    }

    [Fact]
    public void Parse_WithDryRunAndSkipSeed_ShouldSetFlags()
    {
        var options = MigratorExecutionOptions.Parse(new[] { "--dry-run", "--skip-seed" });

        Assert.True(options.DryRun);
        Assert.True(options.SkipSeed);
        Assert.False(options.ShowHelp);
    }

    [Fact]
    public void Parse_WithHelpAlias_ShouldSetShowHelp()
    {
        var options = MigratorExecutionOptions.Parse(new[] { "-h" });

        Assert.True(options.ShowHelp);
    }

    [Fact]
    public void Parse_WithUnknownArgument_ShouldThrow()
    {
        var action = () => MigratorExecutionOptions.Parse(new[] { "--unknown" });

        Assert.Throws<ArgumentException>(action);
    }
}
