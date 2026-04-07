using Subcontractor.Application.ReferenceData.Models;

namespace Subcontractor.Application.ReferenceData;

public interface IReferenceDataService
{
    Task<IReadOnlyList<ReferenceDataItemDto>> ListAsync(string typeCode, bool activeOnly, CancellationToken cancellationToken = default);
    Task<ReferenceDataItemDto> UpsertAsync(string typeCode, UpsertReferenceDataItemRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(string typeCode, string itemCode, CancellationToken cancellationToken = default);
}

