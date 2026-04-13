namespace Subcontractor.Web.Configuration;

public sealed class WebHostTopologyOptions
{
    public const string SectionName = "WebHostTopology";

    public bool EnableEmbeddedWorkers { get; init; }

    public bool EnableDemoSeedWorker { get; init; }
}
