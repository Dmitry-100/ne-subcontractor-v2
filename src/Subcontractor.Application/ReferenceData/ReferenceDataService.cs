using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ReferenceData.Models;

namespace Subcontractor.Application.ReferenceData;

public sealed class ReferenceDataService : IReferenceDataService
{
    private readonly ReferenceDataReadQueryService _readQueryService;
    private readonly ReferenceDataWriteWorkflowService _writeWorkflowService;

    public ReferenceDataService(IApplicationDbContext dbContext)
        : this(
            new ReferenceDataReadQueryService(dbContext),
            new ReferenceDataWriteWorkflowService(dbContext))
    {
    }

    internal ReferenceDataService(
        ReferenceDataReadQueryService readQueryService,
        ReferenceDataWriteWorkflowService writeWorkflowService)
    {
        _readQueryService = readQueryService;
        _writeWorkflowService = writeWorkflowService;
    }

    public async Task<IReadOnlyList<ReferenceDataItemDto>> ListAsync(string typeCode, bool activeOnly, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListAsync(typeCode, activeOnly, cancellationToken);
    }

    public async Task<ReferenceDataItemDto> UpsertAsync(
        string typeCode,
        UpsertReferenceDataItemRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.UpsertAsync(typeCode, request, cancellationToken);
    }

    public async Task<bool> DeleteAsync(string typeCode, string itemCode, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.DeleteAsync(typeCode, itemCode, cancellationToken);
    }
}
