using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.ContractorRatings;

public sealed class ContractorRatingRecalculationWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ContractorRatingRecalculationWorkflowService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<int> RecalculateAsync(
        IReadOnlyList<Contractor> contractors,
        ContractorRatingModelVersion model,
        ContractorRatingRecordSourceType sourceType,
        IReadOnlyDictionary<Guid, ContractorRatingManualAssessment>? manualAssessmentMap,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        if (contractors.Count == 0)
        {
            return 0;
        }

        var contractorIds = contractors.Select(x => x.Id).ToArray();
        var utcNow = _dateTimeProvider.UtcNow;
        var utcToday = utcNow.UtcDateTime.Date;

        var contracts = await _dbContext.Set<Contract>()
            .AsNoTracking()
            .Where(x => contractorIds.Contains(x.ContractorId))
            .Where(x => x.Status == ContractStatus.Signed || x.Status == ContractStatus.Active || x.Status == ContractStatus.Closed)
            .Select(x => new LoadedContract(
                x.Id,
                x.ContractorId,
                x.Status))
            .ToArrayAsync(cancellationToken);

        var contractIds = contracts.Select(x => x.Id).Distinct().ToArray();
        var milestones = await _dbContext.Set<ContractMilestone>()
            .AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId))
            .Select(x => new LoadedMilestone(
                x.ContractId,
                x.PlannedDate,
                x.ProgressPercent))
            .ToArrayAsync(cancellationToken);

        IReadOnlyDictionary<Guid, ContractorRatingManualAssessment> latestManualAssessments;
        if (manualAssessmentMap is not null)
        {
            latestManualAssessments = manualAssessmentMap;
        }
        else
        {
            var assessments = await _dbContext.Set<ContractorRatingManualAssessment>()
                .AsNoTracking()
                .Where(x => contractorIds.Contains(x.ContractorId))
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync(cancellationToken);

            latestManualAssessments = assessments
                .GroupBy(x => x.ContractorId)
                .ToDictionary(x => x.Key, x => x.First());
        }

        var contractsByContractor = contracts
            .GroupBy(x => x.ContractorId)
            .ToDictionary(x => x.Key, x => x.ToArray());

        var milestonesByContractId = milestones
            .GroupBy(x => x.ContractId)
            .ToDictionary(x => x.Key, x => x.ToArray());

        var weights = ContractorRatingScoringPolicy.ResolveWeights(model);
        var historyEntries = new List<ContractorRatingHistoryEntry>(contractors.Count);
        var updatedContractors = 0;

        foreach (var contractor in contractors)
        {
            var contractorContracts = contractsByContractor.GetValueOrDefault(contractor.Id) ?? Array.Empty<LoadedContract>();
            var signedOrActiveContracts = contractorContracts
                .Where(x => x.Status == ContractStatus.Signed || x.Status == ContractStatus.Active)
                .ToArray();

            var signedOrActiveMilestones = signedOrActiveContracts
                .SelectMany(x => milestonesByContractId.GetValueOrDefault(x.Id) ?? Array.Empty<LoadedMilestone>())
                .ToArray();

            var overdueMilestones = signedOrActiveMilestones.Count(x => x.ProgressPercent < 100m && x.PlannedDate < utcToday);
            var deliveryDisciplineScore = ContractorRatingScoringPolicy.CalculateDeliveryDisciplineScore(
                signedOrActiveMilestones.Length,
                overdueMilestones);
            var commercialDisciplineScore = ContractorRatingScoringPolicy.CalculateCommercialDisciplineScore(
                contractorContracts.Length,
                contractorContracts.Count(x => x.Status == ContractStatus.Closed));
            var claimDisciplineScore = ContractorRatingScoringPolicy.CalculateClaimDisciplineScore(contractor.ReliabilityClass);

            latestManualAssessments.TryGetValue(contractor.Id, out var assessment);
            var manualExpertScore = ContractorRatingScoringPolicy.CalculateManualExpertScore(contractor.CurrentRating, assessment?.Score);
            var workloadPenaltyScore = ContractorRatingScoringPolicy.CalculateWorkloadPenaltyScore(contractor.CurrentLoadPercent);
            var finalScore = ContractorRatingScoringPolicy.CalculateFinalScore(
                deliveryDisciplineScore,
                commercialDisciplineScore,
                claimDisciplineScore,
                manualExpertScore,
                workloadPenaltyScore,
                weights);

            var newRating = ContractorRatingScoringPolicy.ScoreToRating(finalScore);
            if (contractor.CurrentRating != newRating)
            {
                contractor.CurrentRating = newRating;
                updatedContractors++;
            }

            historyEntries.Add(new ContractorRatingHistoryEntry
            {
                ContractorId = contractor.Id,
                ModelVersionId = model.Id,
                ManualAssessmentId = assessment?.Id,
                SourceType = sourceType,
                CalculatedAtUtc = utcNow,
                DeliveryDisciplineScore = deliveryDisciplineScore,
                CommercialDisciplineScore = commercialDisciplineScore,
                ClaimDisciplineScore = claimDisciplineScore,
                ManualExpertScore = manualExpertScore,
                WorkloadPenaltyScore = workloadPenaltyScore,
                FinalScore = finalScore,
                Notes = reason
            });
        }

        await _dbContext.Set<ContractorRatingHistoryEntry>().AddRangeAsync(historyEntries, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return updatedContractors;
    }

    private sealed record LoadedContract(Guid Id, Guid ContractorId, ContractStatus Status);
    private sealed record LoadedMilestone(Guid ContractId, DateTime PlannedDate, decimal ProgressPercent);
}
