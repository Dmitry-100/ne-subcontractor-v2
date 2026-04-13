using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings.Models;

namespace Subcontractor.Application.ContractorRatings;

public sealed class ContractorRatingsService : IContractorRatingsService
{
    private readonly ContractorRatingReadQueryService _readQueryService;
    private readonly ContractorRatingModelLifecycleService _modelLifecycleService;
    private readonly ContractorRatingWriteWorkflowService _writeWorkflowService;

    public ContractorRatingsService(IApplicationDbContext dbContext, IDateTimeProvider dateTimeProvider)
        : this(
            dbContext,
            new ContractorRatingReadQueryService(dbContext),
            new ContractorRatingModelLifecycleService(dbContext, dateTimeProvider),
            new ContractorRatingRecalculationWorkflowService(dbContext, dateTimeProvider))
    {
    }

    public ContractorRatingsService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider,
        ContractorRatingReadQueryService readQueryService)
        : this(
            dbContext,
            readQueryService,
            new ContractorRatingModelLifecycleService(dbContext, dateTimeProvider),
            new ContractorRatingRecalculationWorkflowService(dbContext, dateTimeProvider))
    {
    }

    public ContractorRatingsService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider,
        ContractorRatingReadQueryService readQueryService,
        ContractorRatingRecalculationWorkflowService recalculationWorkflowService)
        : this(
            dbContext,
            readQueryService,
            new ContractorRatingModelLifecycleService(dbContext, dateTimeProvider),
            recalculationWorkflowService)
    {
    }

    public ContractorRatingsService(
        IApplicationDbContext dbContext,
        ContractorRatingReadQueryService readQueryService,
        ContractorRatingModelLifecycleService modelLifecycleService,
        ContractorRatingRecalculationWorkflowService recalculationWorkflowService)
        : this(
            readQueryService,
            modelLifecycleService,
            new ContractorRatingWriteWorkflowService(
                dbContext,
                modelLifecycleService,
                recalculationWorkflowService))
    {
    }

    public ContractorRatingsService(
        ContractorRatingReadQueryService readQueryService,
        ContractorRatingModelLifecycleService modelLifecycleService,
        ContractorRatingWriteWorkflowService writeWorkflowService)
    {
        _readQueryService = readQueryService;
        _modelLifecycleService = modelLifecycleService;
        _writeWorkflowService = writeWorkflowService;
    }

    public async Task<ContractorRatingModelDto> GetActiveModelAsync(CancellationToken cancellationToken = default)
    {
        var model = await _modelLifecycleService.EnsureActiveModelAsync(cancellationToken);
        return ContractorRatingReadProjectionPolicy.ToModelDto(model);
    }

    public async Task<ContractorRatingModelDto> UpsertActiveModelAsync(
        UpsertContractorRatingModelRequest request,
        CancellationToken cancellationToken = default)
    {
        var model = await _modelLifecycleService.UpsertActiveModelAsync(request, cancellationToken);
        return ContractorRatingReadProjectionPolicy.ToModelDto(model);
    }

    public async Task<ContractorRatingManualAssessmentDto> UpsertManualAssessmentAsync(
        Guid contractorId,
        UpsertContractorRatingManualAssessmentRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.UpsertManualAssessmentAsync(contractorId, request, cancellationToken);
    }

    public async Task<ContractorRatingRecalculationResultDto> RecalculateRatingsAsync(
        RecalculateContractorRatingsRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.RecalculateRatingsAsync(request, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractorRatingHistoryItemDto>> GetHistoryAsync(
        Guid contractorId,
        int top = 50,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetHistoryAsync(contractorId, top, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractorRatingAnalyticsRowDto>> GetAnalyticsAsync(
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetAnalyticsAsync(cancellationToken);
    }
}
