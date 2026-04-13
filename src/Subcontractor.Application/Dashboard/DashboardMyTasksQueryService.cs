using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Dashboard;

public sealed class DashboardMyTasksQueryService
{
    private readonly IApplicationDbContext _dbContext;

    public DashboardMyTasksQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DashboardTaskItemDto>> BuildAsync(
        Guid appUserId,
        IReadOnlySet<string> roleNames,
        bool includeProcedureTasks,
        bool includeMilestoneTasks,
        DateTime utcToday,
        CancellationToken cancellationToken = default)
    {
        var tasks = new List<DashboardTaskItemDto>(32);

        if (includeProcedureTasks)
        {
            var procedureTasks = await BuildPendingProcedureApprovalTasksAsync(
                appUserId,
                roleNames,
                utcToday,
                cancellationToken);
            tasks.AddRange(procedureTasks);
        }

        if (includeMilestoneTasks)
        {
            var milestoneTasks = await BuildOverdueMilestoneTasksAsync(utcToday, cancellationToken);
            tasks.AddRange(milestoneTasks);
        }

        return tasks
            .OrderByDescending(x => PriorityRank(x.Priority))
            .ThenBy(x => x.DueDate ?? DateTime.MaxValue)
            .Take(20)
            .ToArray();
    }

    private async Task<IReadOnlyList<DashboardTaskItemDto>> BuildPendingProcedureApprovalTasksAsync(
        Guid appUserId,
        IReadOnlySet<string> roleNames,
        DateTime utcToday,
        CancellationToken cancellationToken)
    {
        var approverRoleNames = roleNames.ToArray();
        var rows = await _dbContext.ProcedureApprovalSteps
            .AsNoTracking()
            .Where(x => x.Status == ProcedureApprovalStepStatus.Pending &&
                        x.Procedure.Status == ProcurementProcedureStatus.OnApproval)
            .Where(x =>
                x.ApproverUserId == appUserId ||
                (x.ApproverRoleName != null && approverRoleNames.Contains(x.ApproverRoleName)))
            .Where(x => !_dbContext.ProcedureApprovalSteps.Any(prev =>
                prev.ProcedureId == x.ProcedureId &&
                prev.StepOrder < x.StepOrder &&
                prev.IsRequired &&
                prev.Status != ProcedureApprovalStepStatus.Approved))
            .OrderBy(x => x.Procedure.ProposalDueDate ?? x.Procedure.RequiredSubcontractorDeadline ?? DateTime.MaxValue)
            .ThenBy(x => x.StepOrder)
            .Take(15)
            .Select(x => new
            {
                x.Id,
                x.StepTitle,
                x.Procedure.ObjectName,
                x.Procedure.ProposalDueDate,
                x.Procedure.RequiredSubcontractorDeadline
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(x =>
            {
                var dueDate = x.ProposalDueDate ?? x.RequiredSubcontractorDeadline;
                return new DashboardTaskItemDto(
                    x.Id,
                    "Procedures",
                    x.ObjectName,
                    $"Approval step: {x.StepTitle}",
                    dueDate,
                    ResolvePriority(dueDate, utcToday),
                    BuildProcedureActionUrl(x.ObjectName));
            })
            .ToArray();
    }

    private async Task<IReadOnlyList<DashboardTaskItemDto>> BuildOverdueMilestoneTasksAsync(
        DateTime utcToday,
        CancellationToken cancellationToken)
    {
        var rows = await _dbContext.ContractMilestones
            .AsNoTracking()
            .Where(x => x.ProgressPercent < 100m &&
                        x.PlannedDate < utcToday &&
                        (x.Contract.Status == ContractStatus.Signed || x.Contract.Status == ContractStatus.Active))
            .OrderBy(x => x.PlannedDate)
            .ThenBy(x => x.SortOrder)
            .Take(15)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.PlannedDate,
                x.Contract.ContractNumber
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(x => new DashboardTaskItemDto(
                x.Id,
                "Contracts",
                $"{x.ContractNumber}: {x.Title}",
                "Overdue milestone requires update.",
                x.PlannedDate,
                "High",
                BuildContractActionUrl(x.ContractNumber)))
            .ToArray();
    }

    private static string BuildProcedureActionUrl(string? objectName)
    {
        var encodedSearch = Uri.EscapeDataString(objectName ?? string.Empty);
        return $"/Home/Procedures?status={ProcurementProcedureStatus.OnApproval}&search={encodedSearch}";
    }

    private static string BuildContractActionUrl(string? contractNumber)
    {
        var encodedSearch = Uri.EscapeDataString(contractNumber ?? string.Empty);
        return $"/Home/Contracts?status={ContractStatus.Signed},{ContractStatus.Active}&search={encodedSearch}";
    }

    private static string ResolvePriority(DateTime? dueDate, DateTime utcToday)
    {
        if (!dueDate.HasValue)
        {
            return "Normal";
        }

        if (dueDate.Value < utcToday)
        {
            return "High";
        }

        if (dueDate.Value <= utcToday.AddDays(2))
        {
            return "Medium";
        }

        return "Normal";
    }

    private static int PriorityRank(string priority)
    {
        return priority switch
        {
            "High" => 3,
            "Medium" => 2,
            _ => 1
        };
    }
}
