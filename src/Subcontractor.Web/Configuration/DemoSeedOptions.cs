namespace Subcontractor.Web.Configuration;

public sealed class DemoSeedOptions
{
    public const string SectionName = "DemoSeed";

    public bool EnableApi { get; init; }

    public bool EnableStartupSeed { get; init; }

    public string ContractsPrefix { get; init; } = "SMOKE-READONLY";
}
