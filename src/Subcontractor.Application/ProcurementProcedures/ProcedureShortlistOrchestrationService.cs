using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureShortlistOrchestrationService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IContractorsService? _contractorsService;

    public ProcedureShortlistOrchestrationService(
        IApplicationDbContext dbContext,
        IContractorsService? contractorsService)
    {
        _dbContext = dbContext;
        _contractorsService = contractorsService;
    }

    public async Task<IReadOnlyList<ProcedureShortlistRecommendationDto>> BuildShortlistRecommendationsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.Status is ProcurementProcedureStatus.Canceled or ProcurementProcedureStatus.Completed)
        {
            throw new InvalidOperationException("Shortlist recommendations are not available for completed or canceled procedures.");
        }

        if (_contractorsService is not null)
        {
            await _contractorsService.RecalculateCurrentLoadsAsync(cancellationToken);
        }
        else
        {
            await RecalculateContractorLoadsFallbackAsync(cancellationToken);
        }

        var requiredDisciplines = await _dbContext.Set<LotItem>()
            .AsNoTracking()
            .Where(x => x.LotId == procedure.LotId)
            .Select(x => x.DisciplineCode)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .Distinct()
            .ToArrayAsync(cancellationToken);

        var contractors = await _dbContext.Set<Contractor>()
            .AsNoTracking()
            .Include(x => x.Qualifications)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var candidates = new List<ProcedureShortlistRecommendationCandidateModel>(contractors.Count);

        foreach (var contractor in contractors)
        {
            var qualificationSet = contractor.Qualifications
                .Select(x => x.DisciplineCode.Trim().ToUpperInvariant())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingDisciplines = requiredDisciplines
                .Where(x => !qualificationSet.Contains(x))
                .ToArray();

            var hasRequiredQualifications = missingDisciplines.Length == 0;
            var hasAnyQualificationMatch = requiredDisciplines.Length == 0 ||
                                           requiredDisciplines.Any(x => qualificationSet.Contains(x));
            var isStatusAllowed = contractor.Status == ContractorStatus.Active;
            var isReliabilityAllowed = contractor.ReliabilityClass != ReliabilityClass.D;
            var isLoadAllowed = contractor.CurrentLoadPercent <= 100m;

            var recommendationScore = ProcedureShortlistRecommendationPolicy.CalculateRecommendationScore(
                contractor,
                hasRequiredQualifications,
                hasAnyQualificationMatch);

            var isRecommended = isStatusAllowed && isReliabilityAllowed && isLoadAllowed && hasRequiredQualifications;

            var decisionFactors = ProcedureShortlistRecommendationPolicy.BuildDecisionFactors(
                contractor,
                hasRequiredQualifications,
                hasAnyQualificationMatch,
                missingDisciplines,
                isRecommended);

            candidates.Add(new ProcedureShortlistRecommendationCandidateModel(
                contractor.Id,
                contractor.Name,
                isRecommended,
                recommendationScore,
                contractor.Status,
                contractor.ReliabilityClass,
                contractor.CurrentRating,
                contractor.CurrentLoadPercent,
                hasRequiredQualifications,
                missingDisciplines,
                decisionFactors));
        }

        return ProcedureShortlistRecommendationOrderingPolicy.BuildRecommendations(candidates);
    }

    public async Task<ApplyProcedureShortlistRecommendationsResultDto> ApplyShortlistRecommendationsAsync(
        Guid procedureId,
        ApplyProcedureShortlistRecommendationsRequest request,
        Func<Guid, UpdateProcedureShortlistRequest, CancellationToken, Task<IReadOnlyList<ProcedureShortlistItemDto>>> upsertShortlistAsync,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(upsertShortlistAsync);

        var normalizedMaxIncluded = ProcedureShortlistApplyPolicy.NormalizeMaxIncluded(request.MaxIncluded);

        var recommendations = await BuildShortlistRecommendationsAsync(procedureId, cancellationToken);
        var selected = ProcedureShortlistApplyPolicy.SelectRecommended(recommendations, normalizedMaxIncluded);

        var shortlistRequest = ProcedureShortlistApplyPolicy.BuildUpsertRequest(
            selected,
            ProcedureShortlistApplyPolicy.ResolveAdjustmentReason(request.AdjustmentReason));
        var shortlist = await upsertShortlistAsync(procedureId, shortlistRequest, cancellationToken);

        return new ApplyProcedureShortlistRecommendationsResultDto(
            recommendations.Count,
            selected.Length,
            shortlist);
    }

    public async Task<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>> GetShortlistAdjustmentsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        return await _dbContext.ProcedureShortlistAdjustmentLogs
            .AsNoTracking()
            .Include(x => x.Contractor)
            .Where(x => x.ProcedureId == procedureId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.OperationId)
            .Select(x => new ProcedureShortlistAdjustmentLogDto(
                x.Id,
                x.OperationId,
                x.ContractorId,
                x.Contractor.Name,
                x.PreviousIsIncluded,
                x.NewIsIncluded,
                x.PreviousSortOrder,
                x.NewSortOrder,
                x.PreviousExclusionReason,
                x.NewExclusionReason,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    private async Task<ProcurementProcedure> EnsureProcedureExistsAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == procedureId, cancellationToken);
        return procedure ?? throw new KeyNotFoundException($"Procedure '{procedureId}' is not found.");
    }

    private async Task RecalculateContractorLoadsFallbackAsync(CancellationToken cancellationToken)
    {
        var activeLoadByContractor = await (
                from contract in _dbContext.Set<Contract>().AsNoTracking()
                join item in _dbContext.Set<LotItem>().AsNoTracking()
                    on contract.LotId equals item.LotId
                where contract.Status == ContractStatus.Signed || contract.Status == ContractStatus.Active
                group item by contract.ContractorId
                into grouped
                select new
                {
                    ContractorId = grouped.Key,
                    TotalManHours = grouped.Sum(x => x.ManHours)
                })
            .ToDictionaryAsync(
                x => x.ContractorId,
                x => x.TotalManHours,
                cancellationToken);

        var contractors = await _dbContext.Set<Contractor>()
            .Where(x => x.Status == ContractorStatus.Active)
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var contractor in contractors)
        {
            var activeLoadHours = activeLoadByContractor.GetValueOrDefault(contractor.Id);
            var calculatedLoadPercent = ProcedureShortlistRecommendationPolicy.CalculateLoadPercent(activeLoadHours, contractor.CapacityHours);
            if (contractor.CurrentLoadPercent == calculatedLoadPercent)
            {
                continue;
            }

            contractor.CurrentLoadPercent = calculatedLoadPercent;
            changed = true;
        }

        if (changed)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

}
