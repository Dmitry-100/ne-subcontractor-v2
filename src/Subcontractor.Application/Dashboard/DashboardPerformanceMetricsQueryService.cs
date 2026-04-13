using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Dashboard;

public sealed class DashboardPerformanceMetricsQueryService
{
    private static readonly Func<DbContext, DateTime, Task<int>> CompiledOverdueProceduresCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext, DateTime utcToday) =>
                dbContext.Set<ProcurementProcedure>()
                    .AsNoTracking()
                    .Where(x => x.Status != ProcurementProcedureStatus.Completed &&
                                x.Status != ProcurementProcedureStatus.Canceled)
                    .Where(x =>
                        (x.RequiredSubcontractorDeadline.HasValue && x.RequiredSubcontractorDeadline.Value < utcToday) ||
                        (x.ProposalDueDate.HasValue && x.ProposalDueDate.Value < utcToday))
                    .Count());

    private static readonly Func<DbContext, DateTime, Task<int>> CompiledOverdueContractsCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext, DateTime utcToday) =>
                dbContext.Set<Contract>()
                    .AsNoTracking()
                    .Where(x => x.Status != ContractStatus.Closed &&
                                x.EndDate.HasValue &&
                                x.EndDate.Value < utcToday)
                    .Count());

    private static readonly Func<DbContext, DateTime, Task<int>> CompiledOverdueMilestonesCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext, DateTime utcToday) =>
                dbContext.Set<ContractMilestone>()
                    .AsNoTracking()
                    .Where(x => x.ProgressPercent < 100m && x.PlannedDate < utcToday)
                    .Where(x => x.Contract.Status == ContractStatus.Signed || x.Contract.Status == ContractStatus.Active)
                    .Count());

    private static readonly Func<DbContext, Task<MilestoneCompletionStatsRow>> CompiledMilestoneCompletionStatsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<ContractMilestone>()
                    .AsNoTracking()
                    .Where(x => x.Contract.Status == ContractStatus.Signed || x.Contract.Status == ContractStatus.Active)
                    .GroupBy(_ => 1)
                    .Select(x => new MilestoneCompletionStatsRow(
                        x.Count(),
                        x.Count(m => m.ProgressPercent >= 100m)))
                    .FirstOrDefault());

    private readonly IApplicationDbContext _dbContext;

    public DashboardPerformanceMetricsQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DashboardOverdueDto> BuildOverdueAsync(
        bool canReadProcedures,
        bool canReadContracts,
        DateTime utcToday,
        CancellationToken cancellationToken = default)
    {
        var proceduresCount = 0;
        var contractsCount = 0;
        var milestonesCount = 0;

        if (canReadProcedures)
        {
            if (_dbContext is DbContext efDbContext)
            {
                proceduresCount = await CompiledOverdueProceduresCountQuery(efDbContext, utcToday)
                    .WaitAsync(cancellationToken);
            }
            else
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
        }

        if (canReadContracts)
        {
            if (_dbContext is DbContext efDbContext)
            {
                contractsCount = await CompiledOverdueContractsCountQuery(efDbContext, utcToday)
                    .WaitAsync(cancellationToken);

                milestonesCount = await CompiledOverdueMilestonesCountQuery(efDbContext, utcToday)
                    .WaitAsync(cancellationToken);
            }
            else
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
        }

        return new DashboardOverdueDto(proceduresCount, contractsCount, milestonesCount);
    }

    public async Task<DashboardKpiDto> BuildKpiAsync(
        bool canReadProcedures,
        bool canReadContracts,
        IReadOnlyDictionary<ProcurementProcedureStatus, int>? procedureStatusCounts,
        IReadOnlyDictionary<ContractStatus, int>? contractStatusCounts,
        CancellationToken cancellationToken = default)
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

            MilestoneCompletionStatsRow milestoneStats;
            if (_dbContext is DbContext efDbContext)
            {
                milestoneStats = await CompiledMilestoneCompletionStatsQuery(efDbContext)
                    .WaitAsync(cancellationToken);
            }
            else
            {
                milestoneStats = await _dbContext.ContractMilestones
                    .AsNoTracking()
                    .Where(x => x.Contract.Status == ContractStatus.Signed || x.Contract.Status == ContractStatus.Active)
                    .GroupBy(_ => 1)
                    .Select(x => new MilestoneCompletionStatsRow(
                        x.Count(),
                        x.Count(m => m.ProgressPercent >= 100m)))
                    .FirstOrDefaultAsync(cancellationToken);
            }

            var totalMilestones = milestoneStats.TotalCount;
            var completedMilestones = milestoneStats.CompletedCount;
            milestoneRate = CalculateRatePercent(completedMilestones, totalMilestones);
        }

        return new DashboardKpiDto(procedureRate, contractRate, milestoneRate);
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

    private readonly record struct MilestoneCompletionStatsRow(int TotalCount, int CompletedCount);
}
