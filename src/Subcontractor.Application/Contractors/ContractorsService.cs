using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors.Models;

namespace Subcontractor.Application.Contractors;

public sealed class ContractorsService : IContractorsService
{
    private readonly ContractorReadQueryService _readQueryService;
    private readonly ContractorWriteWorkflowService _writeWorkflowService;

    public ContractorsService(IApplicationDbContext dbContext)
        : this(
            new ContractorReadQueryService(dbContext),
            new ContractorWriteWorkflowService(dbContext))
    {
    }

    internal ContractorsService(
        ContractorReadQueryService readQueryService,
        ContractorWriteWorkflowService writeWorkflowService)
    {
        _readQueryService = readQueryService;
        _writeWorkflowService = writeWorkflowService;
    }

    public async Task<IReadOnlyList<ContractorListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListAsync(search, cancellationToken);
    }

    public async Task<ContractorListPageDto> ListPageAsync(
        string? search,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListPageAsync(search, skip, take, cancellationToken);
    }

    public async Task<ContractorDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetByIdAsync(id, cancellationToken);
    }

    public async Task<ContractorDetailsDto> CreateAsync(CreateContractorRequest request, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.CreateAsync(request, cancellationToken);
    }

    public async Task<ContractorDetailsDto?> UpdateAsync(Guid id, UpdateContractorRequest request, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.UpdateAsync(id, request, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.DeleteAsync(id, cancellationToken);
    }

    public async Task<int> RecalculateCurrentLoadsAsync(CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.RecalculateCurrentLoadsAsync(cancellationToken);
    }
}
