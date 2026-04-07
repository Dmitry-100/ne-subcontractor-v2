namespace Subcontractor.Application.Dashboard.Models;

public sealed record DashboardSummaryDto(
    DateTimeOffset GeneratedAtUtc,
    DashboardCountersDto Counters,
    DashboardOverdueDto Overdue,
    DashboardKpiDto Kpi,
    DashboardImportPipelineDto ImportPipeline,
    IReadOnlyList<DashboardStatusCountDto> LotStatuses,
    IReadOnlyList<DashboardStatusCountDto> ProcedureStatuses,
    IReadOnlyList<DashboardStatusCountDto> ContractStatuses,
    IReadOnlyList<DashboardTaskItemDto> MyTasks);
