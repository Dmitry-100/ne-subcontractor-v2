namespace Subcontractor.Infrastructure.Configuration;

public sealed class SecurityOptions
{
    public const string SectionName = "Security";

    public IReadOnlyCollection<string> BootstrapAdminLogins { get; init; } = Array.Empty<string>();
}
