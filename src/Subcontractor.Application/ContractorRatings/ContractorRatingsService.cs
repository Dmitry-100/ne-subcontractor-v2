using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.ContractorRatings;

public sealed class ContractorRatingsService : IContractorRatingsService
{
    private static readonly IReadOnlyDictionary<ContractorRatingFactorCode, decimal> DefaultWeights =
        new Dictionary<ContractorRatingFactorCode, decimal>
        {
            [ContractorRatingFactorCode.DeliveryDiscipline] = 0.30m,
            [ContractorRatingFactorCode.CommercialDiscipline] = 0.20m,
            [ContractorRatingFactorCode.ClaimDiscipline] = 0.15m,
            [ContractorRatingFactorCode.ManualExpertEvaluation] = 0.25m,
            [ContractorRatingFactorCode.WorkloadPenalty] = 0.10m
        };

    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ContractorRatingsService(IApplicationDbContext dbContext, IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<ContractorRatingModelDto> GetActiveModelAsync(CancellationToken cancellationToken = default)
    {
        var model = await EnsureActiveModelAsync(cancellationToken);
        return ToModelDto(model);
    }

    public async Task<ContractorRatingModelDto> UpsertActiveModelAsync(
        UpsertContractorRatingModelRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var normalizedWeights = NormalizeWeights(request.Weights);
        var utcNow = _dateTimeProvider.UtcNow;

        var activeModel = await _dbContext.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .FirstOrDefaultAsync(x => x.IsActive, cancellationToken);

        if (activeModel is not null)
        {
            activeModel.IsActive = false;
        }

        var baseVersionCode = NormalizeVersionCode(request.VersionCode) ?? $"R-{utcNow:yyyyMMddHHmmss}";
        var versionCode = await EnsureUniqueVersionCodeAsync(baseVersionCode, cancellationToken);

        var model = new ContractorRatingModelVersion
        {
            VersionCode = versionCode,
            Name = NormalizeRequiredText(request.Name) ?? $"Рейтинговая модель {versionCode}",
            IsActive = true,
            ActivatedAtUtc = utcNow,
            Notes = NormalizeOptionalText(request.Notes)
        };

        foreach (var item in normalizedWeights.OrderBy(x => x.Key))
        {
            model.Weights.Add(new ContractorRatingWeight
            {
                FactorCode = item.Key,
                Weight = item.Value.Weight,
                Notes = item.Value.Notes
            });
        }

        await _dbContext.Set<ContractorRatingModelVersion>().AddAsync(model, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToModelDto(model);
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

        var model = await EnsureActiveModelAsync(cancellationToken);
        var assessment = new ContractorRatingManualAssessment
        {
            ContractorId = contractorId,
            ModelVersionId = model.Id,
            Score = decimal.Round(request.Score, 3, MidpointRounding.AwayFromZero),
            Comment = NormalizeOptionalText(request.Comment)
        };

        await _dbContext.Set<ContractorRatingManualAssessment>().AddAsync(assessment, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var manualAssessmentMap = new Dictionary<Guid, ContractorRatingManualAssessment>
        {
            [contractorId] = assessment
        };

        await RecalculateInternalAsync(
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
        var model = await EnsureActiveModelAsync(cancellationToken);

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

        var updatedCount = await RecalculateInternalAsync(
            contractors,
            model,
            ContractorRatingRecordSourceType.AutoRecalculation,
            manualAssessmentMap: null,
            NormalizeOptionalText(request.Reason),
            cancellationToken);

        return new ContractorRatingRecalculationResultDto(
            contractors.Count,
            updatedCount,
            model.Id,
            model.VersionCode);
    }

    public async Task<IReadOnlyList<ContractorRatingHistoryItemDto>> GetHistoryAsync(
        Guid contractorId,
        int top = 50,
        CancellationToken cancellationToken = default)
    {
        var contractorExists = await _dbContext.Contractors
            .AsNoTracking()
            .AnyAsync(x => x.Id == contractorId, cancellationToken);
        if (!contractorExists)
        {
            throw new KeyNotFoundException($"Contractor '{contractorId}' is not found.");
        }

        var normalizedTop = top switch
        {
            < 1 => 1,
            > 200 => 200,
            _ => top
        };

        return await _dbContext.ContractorRatingHistoryEntries
            .AsNoTracking()
            .Include(x => x.ModelVersion)
            .Where(x => x.ContractorId == contractorId)
            .OrderByDescending(x => x.CalculatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Take(normalizedTop)
            .Select(x => new ContractorRatingHistoryItemDto(
                x.Id,
                x.ContractorId,
                x.ModelVersionId,
                x.ModelVersion.VersionCode,
                x.SourceType,
                x.CalculatedAtUtc,
                x.DeliveryDisciplineScore,
                x.CommercialDisciplineScore,
                x.ClaimDisciplineScore,
                x.ManualExpertScore,
                x.WorkloadPenaltyScore,
                x.FinalScore,
                x.Notes,
                x.CreatedBy))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContractorRatingAnalyticsRowDto>> GetAnalyticsAsync(
        CancellationToken cancellationToken = default)
    {
        var contractors = await _dbContext.Contractors
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);

        if (contractors.Length == 0)
        {
            return Array.Empty<ContractorRatingAnalyticsRowDto>();
        }

        var contractorIds = contractors.Select(x => x.Id).ToArray();

        var historyRows = await _dbContext.ContractorRatingHistoryEntries
            .AsNoTracking()
            .Include(x => x.ModelVersion)
            .Where(x => contractorIds.Contains(x.ContractorId))
            .OrderByDescending(x => x.CalculatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var historyByContractor = historyRows
            .GroupBy(x => x.ContractorId)
            .ToDictionary(
                x => x.Key,
                x => x.ToArray());

        return contractors
            .Select(contractor =>
            {
                historyByContractor.TryGetValue(contractor.Id, out var entries);
                var latest = entries?.Length > 0 ? entries[0] : null;
                var previous = entries?.Length > 1 ? entries[1] : null;
                decimal? delta = latest is null || previous is null
                    ? null
                    : decimal.Round((latest.FinalScore - previous.FinalScore) / 20m, 3, MidpointRounding.AwayFromZero);

                return new ContractorRatingAnalyticsRowDto(
                    contractor.Id,
                    contractor.Name,
                    contractor.Status,
                    contractor.ReliabilityClass,
                    contractor.CurrentRating,
                    contractor.CurrentLoadPercent,
                    latest?.CalculatedAtUtc,
                    latest?.ModelVersion.VersionCode,
                    delta);
            })
            .ToArray();
    }

    private async Task<ContractorRatingModelVersion> EnsureActiveModelAsync(CancellationToken cancellationToken)
    {
        var active = await _dbContext.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .FirstOrDefaultAsync(x => x.IsActive, cancellationToken);
        if (active is not null && active.Weights.Count > 0)
        {
            return active;
        }

        if (active is not null && active.Weights.Count == 0)
        {
            foreach (var pair in DefaultWeights)
            {
                active.Weights.Add(new ContractorRatingWeight
                {
                    FactorCode = pair.Key,
                    Weight = pair.Value
                });
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            return active;
        }

        var model = new ContractorRatingModelVersion
        {
            VersionCode = await EnsureUniqueVersionCodeAsync("R-BASE", cancellationToken),
            Name = "Базовая модель рейтинга",
            IsActive = true,
            ActivatedAtUtc = _dateTimeProvider.UtcNow,
            Notes = "Auto-generated baseline model."
        };

        foreach (var pair in DefaultWeights)
        {
            model.Weights.Add(new ContractorRatingWeight
            {
                FactorCode = pair.Key,
                Weight = pair.Value
            });
        }

        await _dbContext.Set<ContractorRatingModelVersion>().AddAsync(model, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return model;
    }

    private async Task<int> RecalculateInternalAsync(
        IReadOnlyList<Contractor> contractors,
        ContractorRatingModelVersion model,
        ContractorRatingRecordSourceType sourceType,
        IReadOnlyDictionary<Guid, ContractorRatingManualAssessment>? manualAssessmentMap,
        string? reason,
        CancellationToken cancellationToken)
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

        var weights = ResolveWeights(model);
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

            var deliveryDisciplineScore = CalculateDeliveryDisciplineScore(signedOrActiveMilestones, utcToday);
            var commercialDisciplineScore = CalculateCommercialDisciplineScore(contractorContracts.Length, contractorContracts.Count(x => x.Status == ContractStatus.Closed));
            var claimDisciplineScore = CalculateClaimDisciplineScore(contractor.ReliabilityClass);

            latestManualAssessments.TryGetValue(contractor.Id, out var assessment);
            var manualExpertScore = CalculateManualExpertScore(contractor.CurrentRating, assessment?.Score);
            var workloadPenaltyScore = CalculateWorkloadPenaltyScore(contractor.CurrentLoadPercent);

            var finalScore = decimal.Round(
                deliveryDisciplineScore * weights.GetValueOrDefault(ContractorRatingFactorCode.DeliveryDiscipline) +
                commercialDisciplineScore * weights.GetValueOrDefault(ContractorRatingFactorCode.CommercialDiscipline) +
                claimDisciplineScore * weights.GetValueOrDefault(ContractorRatingFactorCode.ClaimDiscipline) +
                manualExpertScore * weights.GetValueOrDefault(ContractorRatingFactorCode.ManualExpertEvaluation) +
                workloadPenaltyScore * weights.GetValueOrDefault(ContractorRatingFactorCode.WorkloadPenalty),
                3,
                MidpointRounding.AwayFromZero);

            var newRating = ScoreToRating(finalScore);
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

    private static Dictionary<ContractorRatingFactorCode, decimal> ResolveWeights(ContractorRatingModelVersion model)
    {
        var result = DefaultWeights.ToDictionary(x => x.Key, x => x.Value);
        foreach (var weight in model.Weights)
        {
            result[weight.FactorCode] = weight.Weight;
        }

        var sum = result.Values.Sum();
        if (sum <= 0m)
        {
            return DefaultWeights.ToDictionary(x => x.Key, x => x.Value);
        }

        return result.ToDictionary(
            x => x.Key,
            x => decimal.Round(x.Value / sum, 6, MidpointRounding.AwayFromZero));
    }

    private static decimal CalculateDeliveryDisciplineScore(IEnumerable<LoadedMilestone> milestones, DateTime utcToday)
    {
        var materialized = milestones.ToArray();
        if (materialized.Length == 0)
        {
            return 75m;
        }

        var overdue = materialized.Count(x => x.ProgressPercent < 100m && x.PlannedDate < utcToday);
        var overdueRatio = (decimal)overdue / materialized.Length;
        var score = 100m - overdueRatio * 70m;
        return ClampPercent(score);
    }

    private static decimal CalculateCommercialDisciplineScore(int totalContracts, int closedContracts)
    {
        if (totalContracts <= 0)
        {
            return 70m;
        }

        var ratio = (decimal)closedContracts / totalContracts;
        return ClampPercent(60m + ratio * 40m);
    }

    private static decimal CalculateClaimDisciplineScore(ReliabilityClass reliabilityClass)
    {
        return reliabilityClass switch
        {
            ReliabilityClass.A => 95m,
            ReliabilityClass.B => 80m,
            ReliabilityClass.New => 70m,
            ReliabilityClass.D => 40m,
            _ => 70m
        };
    }

    private static decimal CalculateManualExpertScore(decimal currentRating, decimal? manualAssessmentScore)
    {
        if (manualAssessmentScore.HasValue)
        {
            return ClampPercent(manualAssessmentScore.Value * 20m);
        }

        return ClampPercent(currentRating * 20m);
    }

    private static decimal CalculateWorkloadPenaltyScore(decimal currentLoadPercent)
    {
        if (currentLoadPercent <= 80m)
        {
            return 100m;
        }

        if (currentLoadPercent <= 100m)
        {
            return 85m;
        }

        if (currentLoadPercent <= 120m)
        {
            return 60m;
        }

        return 30m;
    }

    private static decimal ScoreToRating(decimal scorePercent)
    {
        return decimal.Round(ClampPercent(scorePercent) / 20m, 3, MidpointRounding.AwayFromZero);
    }

    private static decimal ClampPercent(decimal value)
    {
        if (value < 0m)
        {
            return 0m;
        }

        return value > 100m ? 100m : decimal.Round(value, 3, MidpointRounding.AwayFromZero);
    }

    private async Task<string> EnsureUniqueVersionCodeAsync(string candidate, CancellationToken cancellationToken)
    {
        var normalized = candidate.Trim().ToUpperInvariant();
        if (!await _dbContext.Set<ContractorRatingModelVersion>().AnyAsync(x => x.VersionCode == normalized, cancellationToken))
        {
            return normalized;
        }

        var suffix = 2;
        while (await _dbContext.Set<ContractorRatingModelVersion>().AnyAsync(x => x.VersionCode == $"{normalized}-{suffix}", cancellationToken))
        {
            suffix++;
        }

        return $"{normalized}-{suffix}";
    }

    private static string? NormalizeRequiredText(string? value)
    {
        var text = NormalizeOptionalText(value);
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static string? NormalizeVersionCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant();
    }

    private static IReadOnlyDictionary<ContractorRatingFactorCode, NormalizedWeightItem> NormalizeWeights(
        IReadOnlyList<UpsertContractorRatingWeightRequest> requestWeights)
    {
        if (requestWeights.Count == 0)
        {
            return DefaultWeights.ToDictionary(
                x => x.Key,
                x => new NormalizedWeightItem(x.Value, null));
        }

        var normalized = requestWeights
            .GroupBy(x => x.FactorCode)
            .ToDictionary(
                x => x.Key,
                x =>
                {
                    if (x.Count() > 1)
                    {
                        throw new ArgumentException($"Duplicate rating weight factor '{x.Key}'.");
                    }

                    var item = x.Single();
                    if (item.Weight < 0m || item.Weight > 1m)
                    {
                        throw new ArgumentException($"Weight for '{item.FactorCode}' must be in range [0..1].");
                    }

                    return new NormalizedWeightItem(item.Weight, NormalizeOptionalText(item.Notes));
                });

        foreach (var factor in DefaultWeights.Keys)
        {
            if (!normalized.ContainsKey(factor))
            {
                normalized[factor] = new NormalizedWeightItem(DefaultWeights[factor], null);
            }
        }

        var sum = normalized.Values.Sum(x => x.Weight);
        if (sum <= 0m)
        {
            throw new ArgumentException("Rating weight sum must be greater than zero.");
        }

        return normalized.ToDictionary(
            x => x.Key,
            x => new NormalizedWeightItem(decimal.Round(x.Value.Weight / sum, 6, MidpointRounding.AwayFromZero), x.Value.Notes));
    }

    private static ContractorRatingModelDto ToModelDto(ContractorRatingModelVersion model)
    {
        var weights = model.Weights
            .OrderBy(x => x.FactorCode)
            .Select(x => new ContractorRatingWeightDto(x.FactorCode, x.Weight, x.Notes))
            .ToArray();

        return new ContractorRatingModelDto(
            model.Id,
            model.VersionCode,
            model.Name,
            model.IsActive,
            model.ActivatedAtUtc,
            model.Notes,
            weights);
    }

    private sealed record NormalizedWeightItem(decimal Weight, string? Notes);
    private sealed record LoadedContract(Guid Id, Guid ContractorId, ContractStatus Status);
    private sealed record LoadedMilestone(Guid ContractId, DateTime PlannedDate, decimal ProgressPercent);
}
