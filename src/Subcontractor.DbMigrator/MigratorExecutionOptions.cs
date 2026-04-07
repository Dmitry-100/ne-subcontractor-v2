namespace Subcontractor.DbMigrator;

public sealed record MigratorExecutionOptions(
    bool DryRun,
    bool SkipSeed,
    bool ShowHelp)
{
    public static MigratorExecutionOptions Parse(IEnumerable<string> args)
    {
        var dryRun = false;
        var skipSeed = false;
        var showHelp = false;

        foreach (var rawArg in args)
        {
            var arg = rawArg.Trim();
            switch (arg)
            {
                case "--dry-run":
                    dryRun = true;
                    break;
                case "--skip-seed":
                    skipSeed = true;
                    break;
                case "--help":
                case "-h":
                    showHelp = true;
                    break;
                default:
                    throw new ArgumentException($"Unknown argument: '{arg}'.", nameof(args));
            }
        }

        return new MigratorExecutionOptions(
            DryRun: dryRun,
            SkipSeed: skipSeed,
            ShowHelp: showHelp);
    }
}
