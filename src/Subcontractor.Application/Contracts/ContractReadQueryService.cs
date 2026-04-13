using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

internal sealed class ContractReadQueryService
{
    private const int DefaultPageSize = 15;
    private const int MaxPageSize = 200;

    private readonly IApplicationDbContext _dbContext;

    public ContractReadQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ContractListItemDto>> ListAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        CancellationToken cancellationToken)
    {
        var query = BuildFilteredQuery(search, status, lotId, procedureId, contractorId);
        var contracts = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return await ProjectListItemsAsync(contracts, cancellationToken);
    }

    public async Task<ContractListPageDto> ListPageAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedSkip = skip < 0 ? 0 : skip;
        var normalizedTake = take <= 0 ? DefaultPageSize : Math.Min(take, MaxPageSize);

        var query = BuildFilteredQuery(search, status, lotId, procedureId, contractorId);
        var totalCount = await query.CountAsync(cancellationToken);
        var contracts = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip(normalizedSkip)
            .Take(normalizedTake)
            .ToListAsync(cancellationToken);

        var items = await ProjectListItemsAsync(contracts, cancellationToken);
        return new ContractListPageDto(items, totalCount, normalizedSkip, normalizedTake);
    }

    public async Task<ContractDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var contract = await _dbContext.Set<Contract>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contract is null)
        {
            return null;
        }

        var contractorName = await ContractDataAccessPolicy.ResolveContractorNameAsync(_dbContext, contract.ContractorId, cancellationToken);
        return ContractReadModelProjectionPolicy.ToDetailsDto(contract, contractorName);
    }

    public async Task<IReadOnlyList<ContractStatusHistoryItemDto>> GetHistoryAsync(
        Guid contractId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.ContractStatusHistory
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ContractStatusHistoryItemDto(
                x.Id,
                x.FromStatus,
                x.ToStatus,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<ContractExecutionSummaryDto> GetExecutionSummaryAsync(
        Guid contractId,
        CancellationToken cancellationToken)
    {
        await ContractDataAccessPolicy.EnsureContractExistsAsync(_dbContext, contractId, cancellationToken);
        return await ContractDataAccessPolicy.BuildExecutionSummaryAsync(_dbContext, contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMilestoneDto>> GetMilestonesAsync(
        Guid contractId,
        CancellationToken cancellationToken)
    {
        await ContractDataAccessPolicy.EnsureContractExistsAsync(_dbContext, contractId, cancellationToken);

        var utcToday = DateTime.UtcNow.Date;
        var milestones = await _dbContext.ContractMilestones
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.PlannedDate)
            .ThenBy(x => x.Title)
            .ToListAsync(cancellationToken);

        return milestones
            .Select(x => ContractReadModelProjectionPolicy.ToMilestoneDto(x, utcToday))
            .ToArray();
    }

    public async Task<IReadOnlyList<ContractMonitoringControlPointDto>> GetMonitoringControlPointsAsync(
        Guid contractId,
        CancellationToken cancellationToken)
    {
        await ContractDataAccessPolicy.EnsureContractExistsAsync(_dbContext, contractId, cancellationToken);

        var controlPoints = await _dbContext.ContractMonitoringControlPoints
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .Include(x => x.Stages)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.PlannedDate)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var utcToday = DateTime.UtcNow.Date;
        return controlPoints
            .Select(x => ContractReadModelProjectionPolicy.ToControlPointDto(x, utcToday))
            .ToArray();
    }

    public async Task<IReadOnlyList<ContractMdrCardDto>> GetMdrCardsAsync(
        Guid contractId,
        CancellationToken cancellationToken)
    {
        await ContractDataAccessPolicy.EnsureContractExistsAsync(_dbContext, contractId, cancellationToken);

        var cards = await _dbContext.ContractMdrCards
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .Include(x => x.Rows)
            .OrderBy(x => x.SortOrder)
            .ThenByDescending(x => x.ReportingDate)
            .ThenBy(x => x.Title)
            .ToListAsync(cancellationToken);

        return cards
            .Select(ContractReadModelProjectionPolicy.ToMdrCardDto)
            .ToArray();
    }

    private IQueryable<Contract> BuildFilteredQuery(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId)
    {
        var query = _dbContext.Contracts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x => x.ContractNumber.Contains(normalizedSearch));
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (lotId.HasValue)
        {
            query = query.Where(x => x.LotId == lotId.Value);
        }

        if (procedureId.HasValue)
        {
            query = query.Where(x => x.ProcedureId == procedureId.Value);
        }

        if (contractorId.HasValue)
        {
            query = query.Where(x => x.ContractorId == contractorId.Value);
        }

        return query;
    }

    private async Task<IReadOnlyList<ContractListItemDto>> ProjectListItemsAsync(
        IReadOnlyList<Contract> contracts,
        CancellationToken cancellationToken)
    {
        var contractorNames = await ContractDataAccessPolicy.ResolveContractorNamesAsync(
            _dbContext,
            contracts.Select(x => x.ContractorId).Distinct().ToArray(),
            cancellationToken);

        return contracts
            .Select(x => ContractReadModelProjectionPolicy.ToListItemDto(
                x,
                contractorNames.TryGetValue(x.ContractorId, out var name) ? name : null))
            .ToArray();
    }
}
