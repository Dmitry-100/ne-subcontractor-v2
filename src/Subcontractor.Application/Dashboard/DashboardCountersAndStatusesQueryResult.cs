using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Dashboard;

public sealed record DashboardCountersAndStatusesQueryResult(
    DashboardCountersDto Counters,
    IReadOnlyList<DashboardStatusCountDto> LotStatuses,
    IReadOnlyList<DashboardStatusCountDto> ProcedureStatuses,
    IReadOnlyList<DashboardStatusCountDto> ContractStatuses,
    IReadOnlyDictionary<LotStatus, int>? LotStatusCounts,
    IReadOnlyDictionary<ProcurementProcedureStatus, int>? ProcedureStatusCounts,
    IReadOnlyDictionary<ContractStatus, int>? ContractStatusCounts);
