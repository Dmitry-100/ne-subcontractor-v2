namespace Subcontractor.Application.Dashboard.Models;

public sealed record DashboardKpiDto(
    decimal? ProcedureCompletionRatePercent,
    decimal? ContractClosureRatePercent,
    decimal? MilestoneCompletionRatePercent);
