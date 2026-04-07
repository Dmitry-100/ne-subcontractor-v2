namespace Subcontractor.Application.Dashboard.Models;

public sealed record DashboardOverdueDto(
    int ProceduresCount,
    int ContractsCount,
    int MilestonesCount);
