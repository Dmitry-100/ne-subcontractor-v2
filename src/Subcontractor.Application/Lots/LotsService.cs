using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

public sealed class LotsService : ILotsService
{
    private readonly LotReadQueryService _readQueryService;
    private readonly LotWriteWorkflowService _writeWorkflowService;

    public LotsService(IApplicationDbContext dbContext)
        : this(
            new LotReadQueryService(dbContext),
            new LotWriteWorkflowService(dbContext))
    {
    }

    internal LotsService(
        LotReadQueryService readQueryService,
        LotWriteWorkflowService writeWorkflowService)
    {
        _readQueryService = readQueryService;
        _writeWorkflowService = writeWorkflowService;
    }

    public async Task<IReadOnlyList<LotListItemDto>> ListAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListAsync(search, status, projectId, cancellationToken);
    }

    public async Task<LotListPageDto> ListPageAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListPageAsync(
            search,
            status,
            projectId,
            skip,
            take,
            cancellationToken);
    }

    public async Task<LotDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetByIdAsync(id, cancellationToken);
    }

    public async Task<LotDetailsDto> CreateAsync(CreateLotRequest request, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.CreateAsync(request, cancellationToken);
    }

    public async Task<LotDetailsDto?> UpdateAsync(Guid id, UpdateLotRequest request, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.UpdateAsync(id, request, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.DeleteAsync(id, cancellationToken);
    }

    public async Task<LotStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        LotStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.TransitionAsync(id, request, cancellationToken);
    }

    public async Task<IReadOnlyList<LotStatusHistoryItemDto>> GetHistoryAsync(Guid lotId, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetHistoryAsync(lotId, cancellationToken);
    }
}
