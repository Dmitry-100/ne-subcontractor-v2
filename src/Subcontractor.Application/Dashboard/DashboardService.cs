using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.Dashboard;

public sealed class DashboardService : IDashboardService
{
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly DashboardImportPipelineQueryService _importPipelineQueryService;
    private readonly DashboardMyTasksQueryService _myTasksQueryService;
    private readonly DashboardPerformanceMetricsQueryService _performanceMetricsQueryService;
    private readonly DashboardUserContextResolverService _userContextResolverService;
    private readonly DashboardCountersAndStatusesQueryService _countersAndStatusesQueryService;

    public DashboardService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider)
        : this(
            dbContext,
            currentUserService,
            dateTimeProvider,
            new DashboardImportPipelineQueryService(dbContext),
            new DashboardMyTasksQueryService(dbContext),
            new DashboardPerformanceMetricsQueryService(dbContext),
            new DashboardUserContextResolverService(dbContext, currentUserService),
            new DashboardCountersAndStatusesQueryService(dbContext))
    {
    }

    public DashboardService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider,
        DashboardImportPipelineQueryService importPipelineQueryService,
        DashboardMyTasksQueryService myTasksQueryService,
        DashboardPerformanceMetricsQueryService performanceMetricsQueryService,
        DashboardUserContextResolverService userContextResolverService,
        DashboardCountersAndStatusesQueryService countersAndStatusesQueryService)
    {
        _dateTimeProvider = dateTimeProvider;
        _importPipelineQueryService = importPipelineQueryService;
        _myTasksQueryService = myTasksQueryService;
        _performanceMetricsQueryService = performanceMetricsQueryService;
        _userContextResolverService = userContextResolverService;
        _countersAndStatusesQueryService = countersAndStatusesQueryService;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var utcNow = _dateTimeProvider.UtcNow;
        var utcToday = utcNow.UtcDateTime.Date;
        var userContext = await _userContextResolverService.ResolveAsync(cancellationToken);

        if (userContext is null)
        {
            return CreateEmptySummary(utcNow);
        }

        var canReadProjects = HasPermission(userContext, PermissionCodes.ProjectsRead);
        var canReadLots = HasPermission(userContext, PermissionCodes.LotsRead);
        var canReadProcedures = HasPermission(userContext, PermissionCodes.ProceduresRead);
        var canTransitionProcedures = HasPermission(userContext, PermissionCodes.ProceduresTransition);
        var canReadContracts = HasPermission(userContext, PermissionCodes.ContractsRead);
        var canUpdateContracts = HasPermission(userContext, PermissionCodes.ContractsUpdate);
        var canReadImports = HasPermission(userContext, PermissionCodes.ImportsRead);

        var countersAndStatuses = await _countersAndStatusesQueryService.BuildAsync(
            userContext,
            canReadProjects,
            canReadLots,
            canReadProcedures,
            canReadContracts,
            cancellationToken);

        var overdue = await _performanceMetricsQueryService.BuildOverdueAsync(
            canReadProcedures,
            canReadContracts,
            utcToday,
            cancellationToken);
        var kpi = await _performanceMetricsQueryService.BuildKpiAsync(
            canReadProcedures,
            canReadContracts,
            countersAndStatuses.ProcedureStatusCounts,
            countersAndStatuses.ContractStatusCounts,
            cancellationToken);
        var importPipeline = canReadImports
            ? await _importPipelineQueryService.BuildAsync(cancellationToken)
            : DashboardImportPipelineQueryService.CreateEmpty();
        var tasks = await _myTasksQueryService.BuildAsync(
            userContext.AppUserId,
            userContext.RoleNames,
            canTransitionProcedures,
            canUpdateContracts,
            utcToday,
            cancellationToken);

        return new DashboardSummaryDto(
            utcNow,
            countersAndStatuses.Counters,
            overdue,
            kpi,
            importPipeline,
            countersAndStatuses.LotStatuses,
            countersAndStatuses.ProcedureStatuses,
            countersAndStatuses.ContractStatuses,
            tasks);
    }

    private static DashboardSummaryDto CreateEmptySummary(DateTimeOffset utcNow)
    {
        return new DashboardSummaryDto(
            utcNow,
            new DashboardCountersDto(0, 0, 0, 0),
            new DashboardOverdueDto(0, 0, 0),
            new DashboardKpiDto(null, null, null),
            DashboardImportPipelineQueryService.CreateEmpty(),
            [],
            [],
            [],
            []);
    }

    private static bool HasPermission(DashboardUserContext userContext, string permissionCode)
    {
        return userContext.Permissions.Contains(permissionCode);
    }

}
