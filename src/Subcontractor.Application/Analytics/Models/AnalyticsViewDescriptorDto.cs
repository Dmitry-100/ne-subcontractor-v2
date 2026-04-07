namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsViewDescriptorDto(
    string ViewName,
    string Description,
    string Grain,
    string PrimaryUse);
