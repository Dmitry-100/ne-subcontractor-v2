using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.ContractorRatings;

public sealed class ContractorRatingWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ContractorRatingModelLifecycleService _modelLifecycleService;
    private readonly ContractorRatingRecalculationWorkflowService _recalculationWorkflowService;

    public ContractorRatingWriteWorkflowService(
        IApplicationDbContext dbContext,
        ContractorRatingModelLifecycleService modelLifecycleService,
        ContractorRatingRecalculationWorkflowService recalculationWorkflowService)
    {
        _dbContext = dbContext;
        _modelLifecycleService = modelLifecycleService;
        _recalculationWorkflowService = recalculationWorkflowService;
    }

    public async Task<ContractorRatingManualAssessmentDto> UpsertManualAssessmentAsync(
        Guid contractorId,
        UpsertContractorRatingManualAssessmentRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Score < 0m || request.Score > 5m)
        {
            throw new ArgumentException("Manual assessment score must be in range [0..5].", nameof(request.Score));
        }

        var contractor = await _dbContext.Set<Contractor>()
            .FirstOrDefaultAsync(x => x.Id == contractorId, cancellationToken);
        if (contractor is null)
        {
            throw new KeyNotFoundException($"Contractor '{contractorId}' is not found.");
        }

        var model = await _modelLifecycleService.EnsureActiveModelAsync(cancellationToken);
        var assessment = new ContractorRatingManualAssessment
        {
            ContractorId = contractorId,
            ModelVersionId = model.Id,
            Score = decimal.Round(request.Score, 3, MidpointRounding.AwayFromZero),
            Comment = ContractorRatingModelRequestPolicy.NormalizeOptionalText(request.Comment)
        };

        await _dbContext.Set<ContractorRatingManualAssessment>().AddAsync(assessment, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var manualAssessmentMap = new Dictionary<Guid, ContractorRatingManualAssessment>
        {
            [contractorId] = assessment
        };

        await _recalculationWorkflowService.RecalculateAsync(
            [contractor],
            model,
            ContractorRatingRecordSourceType.ManualAssessment,
            manualAssessmentMap,
            "Manual expert assessment updated.",
            cancellationToken);

        return new ContractorRatingManualAssessmentDto(
            assessment.Id,
            assessment.ContractorId,
            assessment.ModelVersionId,
            assessment.Score,
            assessment.Comment,
            assessment.CreatedAtUtc,
            assessment.CreatedBy);
    }

    public async Task<ContractorRatingRecalculationResultDto> RecalculateRatingsAsync(
        RecalculateContractorRatingsRequest request,
        CancellationToken cancellationToken = default)
    {
        request ??= new RecalculateContractorRatingsRequest();
        var model = await _modelLifecycleService.EnsureActiveModelAsync(cancellationToken);

        var query = _dbContext.Set<Contractor>().AsQueryable();
        if (!request.IncludeInactiveContractors)
        {
            query = query.Where(x => x.Status == ContractorStatus.Active);
        }

        if (request.ContractorId.HasValue)
        {
            query = query.Where(x => x.Id == request.ContractorId.Value);
        }

        var contractors = await query.ToListAsync(cancellationToken);
        if (request.ContractorId.HasValue && contractors.Count == 0)
        {
            throw new KeyNotFoundException($"Contractor '{request.ContractorId.Value}' is not found.");
        }

        var updatedCount = await _recalculationWorkflowService.RecalculateAsync(
            contractors,
            model,
            ContractorRatingRecordSourceType.AutoRecalculation,
            manualAssessmentMap: null,
            ContractorRatingModelRequestPolicy.NormalizeOptionalText(request.Reason),
            cancellationToken);

        return new ContractorRatingRecalculationResultDto(
            contractors.Count,
            updatedCount,
            model.Id,
            model.VersionCode);
    }
}
