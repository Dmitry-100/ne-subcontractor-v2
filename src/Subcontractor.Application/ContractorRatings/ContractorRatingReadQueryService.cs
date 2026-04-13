using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings.Models;

namespace Subcontractor.Application.ContractorRatings;

public sealed class ContractorRatingReadQueryService
{
    private readonly IApplicationDbContext _dbContext;

    public ContractorRatingReadQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ContractorRatingHistoryItemDto>> GetHistoryAsync(
        Guid contractorId,
        int top,
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
}
