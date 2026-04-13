using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

public interface ILotsService
{
    Task<IReadOnlyList<LotListItemDto>> ListAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        CancellationToken cancellationToken = default);
    Task<LotListPageDto> ListPageAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    Task<LotDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LotDetailsDto> CreateAsync(CreateLotRequest request, CancellationToken cancellationToken = default);
    Task<LotDetailsDto?> UpdateAsync(Guid id, UpdateLotRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LotStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        LotStatusTransitionRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LotStatusHistoryItemDto>> GetHistoryAsync(Guid lotId, CancellationToken cancellationToken = default);
}
