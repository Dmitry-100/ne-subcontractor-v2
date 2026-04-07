namespace Subcontractor.Web.Models;

public sealed record RegistryPageViewModel(
    string Title,
    string Description,
    string ApiEndpoint,
    string Hint);
