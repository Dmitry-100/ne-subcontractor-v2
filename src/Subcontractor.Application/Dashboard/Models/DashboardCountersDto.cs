namespace Subcontractor.Application.Dashboard.Models;

public sealed record DashboardCountersDto(
    int ProjectsTotal,
    int LotsTotal,
    int ProceduresTotal,
    int ContractsTotal);
