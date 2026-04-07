using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Application.Security;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.Dashboard;

public sealed class DashboardService : IDashboardService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;

    public DashboardService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var utcNow = _dateTimeProvider.UtcNow;
        var utcToday = utcNow.UtcDateTime.Date;
        var userContext = await ResolveUserContextAsync(cancellationToken);

        if (userContext is null)
        {
            return CreateEmptySummary(utcNow);
        }

        var canReadProjects = HasPermission(userContext, PermissionCodes.ProjectsRead);
        var canReadLots = HasPermission(userContext, PermissionCodes.LotsRead);
        var canReadProcedures = HasPermission(userContext, PermissionCodes.ProceduresRead);
        var canReadContracts = HasPermission(userContext, PermissionCodes.ContractsRead);
        var canReadImports = HasPermission(userContext, PermissionCodes.ImportsRead);

        var lotStatusCounts = canReadLots
            ? await LoadLotStatusCountsAsync(cancellationToken)
            : null;
        var procedureStatusCounts = canReadProcedures
            ? await LoadProcedureStatusCountsAsync(cancellationToken)
            : null;
        var contractStatusCounts = canReadContracts
            ? await LoadContractStatusCountsAsync(cancellationToken)
            : null;

        var projectsTotal = canReadProjects
            ? await CountProjectsAsync(userContext, cancellationToken)
            : 0;
        var lotsTotal = lotStatusCounts is not null
            ? lotStatusCounts.Values.Sum()
            : 0;
        var proceduresTotal = procedureStatusCounts is not null
            ? procedureStatusCounts.Values.Sum()
            : 0;
        var contractsTotal = contractStatusCounts is not null
            ? contractStatusCounts.Values.Sum()
            : 0;

        var lotStatuses = lotStatusCounts is not null
            ? ToStatusList(lotStatusCounts, Enum.GetValues<LotStatus>())
            : [];
        var procedureStatuses = procedureStatusCounts is not null
            ? ToStatusList(procedureStatusCounts, Enum.GetValues<ProcurementProcedureStatus>())
            : [];
        var contractStatuses = contractStatusCounts is not null
            ? ToStatusList(contractStatusCounts, Enum.GetValues<ContractStatus>())
            : [];

        var overdue = await BuildOverdueAsync(
            canReadProcedures,
            canReadContracts,
            utcToday,
            cancellationToken);
        var kpi = await BuildKpiAsync(
            canReadProcedures,
            canReadContracts,
            procedureStatusCounts,
            contractStatusCounts,
            cancellationToken);
        var importPipeline = canReadImports
            ? await BuildImportPipelineAsync(cancellationToken)
            : CreateEmptyImportPipeline();
        var tasks = await BuildMyTasksAsync(userContext, utcToday, cancellationToken);

        return new DashboardSummaryDto(
            utcNow,
            new DashboardCountersDto(projectsTotal, lotsTotal, proceduresTotal, contractsTotal),
            overdue,
            kpi,
            importPipeline,
            lotStatuses,
            procedureStatuses,
            contractStatuses,
            tasks);
    }

    private static DashboardSummaryDto CreateEmptySummary(DateTimeOffset utcNow)
    {
        return new DashboardSummaryDto(
            utcNow,
            new DashboardCountersDto(0, 0, 0, 0),
            new DashboardOverdueDto(0, 0, 0),
            new DashboardKpiDto(null, null, null),
            CreateEmptyImportPipeline(),
            [],
            [],
            [],
            []);
    }

    private static DashboardImportPipelineDto CreateEmptyImportPipeline()
    {
        return new DashboardImportPipelineDto(
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0);
    }

    private async Task<DashboardUserContext?> ResolveUserContextAsync(CancellationToken cancellationToken)
    {
        var normalizedLogin = LoginNormalizer.Normalize(_currentUserService.UserLogin);
        if (string.IsNullOrWhiteSpace(normalizedLogin) || normalizedLogin == "system")
        {
            return null;
        }

        var user = await _dbContext.Set<AppUser>()
            .AsNoTracking()
            .Include(x => x.Roles)
            .ThenInclude(x => x.AppRole)
            .ThenInclude(x => x.Permissions)
            .FirstOrDefaultAsync(x => x.Login == normalizedLogin && x.IsActive, cancellationToken);

        if (user is null)
        {
            return null;
        }

        var roleNames = user.Roles
            .Select(x => x.AppRole.Name)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var permissions = user.Roles
            .SelectMany(x => x.AppRole.Permissions)
            .Select(x => x.PermissionCode)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var hasProjectsGlobalRead = permissions.Contains(PermissionCodes.ProjectsReadAll)
                                    || permissions.Contains(PermissionCodes.ProjectsCreate)
                                    || permissions.Contains(PermissionCodes.ProjectsUpdate)
                                    || permissions.Contains(PermissionCodes.ProjectsDelete);

        return new DashboardUserContext(
            user.Id,
            roleNames,
            permissions,
            hasProjectsGlobalRead);
    }

    private static bool HasPermission(DashboardUserContext userContext, string permissionCode)
    {
        return userContext.Permissions.Contains(permissionCode);
    }

    private async Task<int> CountProjectsAsync(DashboardUserContext userContext, CancellationToken cancellationToken)
    {
        var query = _dbContext.Projects.AsNoTracking();
        query = ApplyProjectScope(query, userContext);
        return await query.CountAsync(cancellationToken);
    }

    private static IQueryable<Project> ApplyProjectScope(IQueryable<Project> query, DashboardUserContext userContext)
    {
        if (userContext.HasProjectsGlobalRead)
        {
            return query;
        }

        return query.Where(x => x.GipUserId == userContext.AppUserId);
    }

    private async Task<Dictionary<LotStatus, int>> LoadLotStatusCountsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Lots
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    private async Task<Dictionary<ProcurementProcedureStatus, int>> LoadProcedureStatusCountsAsync(
        CancellationToken cancellationToken)
    {
        return await _dbContext.Procedures
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    private async Task<Dictionary<ContractStatus, int>> LoadContractStatusCountsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Contracts
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    private static IReadOnlyList<DashboardStatusCountDto> ToStatusList<TStatus>(
        IReadOnlyDictionary<TStatus, int> counts,
        TStatus[] statuses)
        where TStatus : struct, Enum
    {
        return statuses
            .Select(status => new DashboardStatusCountDto(
                status.ToString(),
                counts.TryGetValue(status, out var count) ? count : 0))
            .ToArray();
    }

    private async Task<DashboardOverdueDto> BuildOverdueAsync(
        bool canReadProcedures,
        bool canReadContracts,
        DateTime utcToday,
        CancellationToken cancellationToken)
    {
        var proceduresCount = 0;
        var contractsCount = 0;
        var milestonesCount = 0;

        if (canReadProcedures)
        {
            proceduresCount = await _dbContext.Procedures
                .AsNoTracking()
                .Where(x => x.Status != ProcurementProcedureStatus.Completed &&
                            x.Status != ProcurementProcedureStatus.Canceled)
                .Where(x =>
                    (x.RequiredSubcontractorDeadline.HasValue && x.RequiredSubcontractorDeadline.Value < utcToday) ||
                    (x.ProposalDueDate.HasValue && x.ProposalDueDate.Value < utcToday))
                .CountAsync(cancellationToken);
        }

        if (canReadContracts)
        {
            contractsCount = await _dbContext.Contracts
                .AsNoTracking()
                .Where(x => x.Status != ContractStatus.Closed &&
                            x.EndDate.HasValue &&
                            x.EndDate.Value < utcToday)
                .CountAsync(cancellationToken);

            milestonesCount = await _dbContext.ContractMilestones
                .AsNoTracking()
                .Where(x => x.ProgressPercent < 100m && x.PlannedDate < utcToday)
                .Where(x => x.Contract.Status == ContractStatus.Signed || x.Contract.Status == ContractStatus.Active)
                .CountAsync(cancellationToken);
        }

        return new DashboardOverdueDto(proceduresCount, contractsCount, milestonesCount);
    }

    private async Task<DashboardKpiDto> BuildKpiAsync(
        bool canReadProcedures,
        bool canReadContracts,
        IReadOnlyDictionary<ProcurementProcedureStatus, int>? procedureStatusCounts,
        IReadOnlyDictionary<ContractStatus, int>? contractStatusCounts,
        CancellationToken cancellationToken)
    {
        decimal? procedureRate = null;
        decimal? contractRate = null;
        decimal? milestoneRate = null;

        if (canReadProcedures && procedureStatusCounts is not null)
        {
            var totalProcedures = procedureStatusCounts
                .Where(x => x.Key != ProcurementProcedureStatus.Canceled)
                .Sum(x => x.Value);
            procedureStatusCounts.TryGetValue(ProcurementProcedureStatus.Completed, out var completedProcedures);

            procedureRate = CalculateRatePercent(completedProcedures, totalProcedures);
        }

        if (canReadContracts && contractStatusCounts is not null)
        {
            var totalContracts = contractStatusCounts.Values.Sum();
            contractStatusCounts.TryGetValue(ContractStatus.Closed, out var closedContracts);

            contractRate = CalculateRatePercent(closedContracts, totalContracts);

            var milestoneStats = await _dbContext.ContractMilestones
                .AsNoTracking()
                .Where(x => x.Contract.Status == ContractStatus.Signed || x.Contract.Status == ContractStatus.Active)
                .GroupBy(_ => 1)
                .Select(x => new
                {
                    Total = x.Count(),
                    Completed = x.Count(m => m.ProgressPercent >= 100m)
                })
                .FirstOrDefaultAsync(cancellationToken);

            var totalMilestones = milestoneStats?.Total ?? 0;
            var completedMilestones = milestoneStats?.Completed ?? 0;
            milestoneRate = CalculateRatePercent(completedMilestones, totalMilestones);
        }

        return new DashboardKpiDto(procedureRate, contractRate, milestoneRate);
    }

    private async Task<IReadOnlyList<DashboardTaskItemDto>> BuildMyTasksAsync(
        DashboardUserContext userContext,
        DateTime utcToday,
        CancellationToken cancellationToken)
    {
        var tasks = new List<DashboardTaskItemDto>(32);

        if (HasPermission(userContext, PermissionCodes.ProceduresTransition))
        {
            var procedureTasks = await BuildPendingProcedureApprovalTasksAsync(userContext, utcToday, cancellationToken);
            tasks.AddRange(procedureTasks);
        }

        if (HasPermission(userContext, PermissionCodes.ContractsUpdate))
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

    private async Task<DashboardImportPipelineDto> BuildImportPipelineAsync(CancellationToken cancellationToken)
    {
        var sourceStatusCounts = await _dbContext.SourceDataImportBatches
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var xmlStatusCounts = await _dbContext.XmlSourceDataImportInboxItems
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var sourceInvalidRowsCount = await _dbContext.SourceDataImportBatches
            .AsNoTracking()
            .Where(x =>
                x.Status == SourceDataImportBatchStatus.ValidatedWithErrors ||
                x.Status == SourceDataImportBatchStatus.Rejected ||
                x.Status == SourceDataImportBatchStatus.Failed)
            .SumAsync(x => x.InvalidRows, cancellationToken);

        var xmlRetriedPendingCount = await _dbContext.XmlSourceDataImportInboxItems
            .AsNoTracking()
            .Where(x => x.Status == XmlSourceDataImportInboxStatus.Received && x.LastModifiedAtUtc.HasValue)
            .CountAsync(cancellationToken);

        var traceStatusCounts = await _dbContext.SourceDataLotReconciliationRecords
            .AsNoTracking()
            .GroupBy(x => x.IsCreated)
            .Select(x => new { x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var traceCreatedLotsCount = await _dbContext.SourceDataLotReconciliationRecords
            .AsNoTracking()
            .Where(x => x.IsCreated && x.LotId.HasValue)
            .Select(x => x.LotId!.Value)
            .Distinct()
            .CountAsync(cancellationToken);

        var sourceUploadedCount = sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Uploaded);
        var sourceProcessingCount = sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Processing);
        var traceCreatedGroupsCount = traceStatusCounts.GetValueOrDefault(true);
        var traceSkippedGroupsCount = traceStatusCounts.GetValueOrDefault(false);
        var traceAppliedGroupsCount = traceCreatedGroupsCount + traceSkippedGroupsCount;

        return new DashboardImportPipelineDto(
            sourceUploadedCount,
            sourceProcessingCount,
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.ReadyForLotting),
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.ValidatedWithErrors),
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Failed),
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Rejected),
            sourceInvalidRowsCount,
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Received),
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Processing),
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Completed),
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Failed),
            xmlRetriedPendingCount,
            traceAppliedGroupsCount,
            traceCreatedGroupsCount,
            traceSkippedGroupsCount,
            traceCreatedLotsCount);
    }

    private async Task<IReadOnlyList<DashboardTaskItemDto>> BuildPendingProcedureApprovalTasksAsync(
        DashboardUserContext userContext,
        DateTime utcToday,
        CancellationToken cancellationToken)
    {
        var roleNames = userContext.RoleNames.ToArray();
        var rows = await _dbContext.ProcedureApprovalSteps
            .AsNoTracking()
            .Where(x => x.Status == ProcedureApprovalStepStatus.Pending &&
                        x.Procedure.Status == ProcurementProcedureStatus.OnApproval)
            .Where(x =>
                x.ApproverUserId == userContext.AppUserId ||
                (x.ApproverRoleName != null && roleNames.Contains(x.ApproverRoleName)))
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
        return $"/procedures?status={ProcurementProcedureStatus.OnApproval}&search={encodedSearch}";
    }

    private static string BuildContractActionUrl(string? contractNumber)
    {
        var encodedSearch = Uri.EscapeDataString(contractNumber ?? string.Empty);
        return $"/contracts?status={ContractStatus.Signed},{ContractStatus.Active}&search={encodedSearch}";
    }

    private static decimal? CalculateRatePercent(int numerator, int denominator)
    {
        if (denominator <= 0)
        {
            return null;
        }

        var raw = (decimal)numerator * 100m / denominator;
        return decimal.Round(raw, 2, MidpointRounding.AwayFromZero);
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

    private sealed record DashboardUserContext(
        Guid AppUserId,
        IReadOnlySet<string> RoleNames,
        IReadOnlySet<string> Permissions,
        bool HasProjectsGlobalRead);
}
