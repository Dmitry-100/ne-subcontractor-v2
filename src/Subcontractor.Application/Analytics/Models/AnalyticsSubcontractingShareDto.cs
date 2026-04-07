namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsSubcontractingShareDto(
    decimal TotalPlannedManHours,
    decimal ContractedManHours,
    decimal? SharePercent);
