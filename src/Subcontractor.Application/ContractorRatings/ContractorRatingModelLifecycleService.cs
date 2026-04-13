using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings.Models;
using Subcontractor.Domain.ContractorRatings;

namespace Subcontractor.Application.ContractorRatings;

public sealed class ContractorRatingModelLifecycleService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ContractorRatingModelLifecycleService(
        IApplicationDbContext dbContext,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<ContractorRatingModelVersion> EnsureActiveModelAsync(CancellationToken cancellationToken = default)
    {
        var active = await _dbContext.Set<ContractorRatingModelVersion>()
            .AsNoTracking()
            .Include(x => x.Weights)
            .FirstOrDefaultAsync(x => x.IsActive, cancellationToken);
        if (active is not null && active.Weights.Count > 0)
        {
            return active;
        }

        if (active is not null && active.Weights.Count == 0)
        {
            foreach (var pair in ContractorRatingScoringPolicy.DefaultWeights)
            {
                await _dbContext.Set<ContractorRatingWeight>().AddAsync(new ContractorRatingWeight
                {
                    ModelVersionId = active.Id,
                    FactorCode = pair.Key,
                    Weight = pair.Value
                }, cancellationToken);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            return await _dbContext.Set<ContractorRatingModelVersion>()
                .Include(x => x.Weights)
                .SingleAsync(x => x.Id == active.Id, cancellationToken);
        }

        var model = new ContractorRatingModelVersion
        {
            VersionCode = await EnsureUniqueVersionCodeAsync("R-BASE", cancellationToken),
            Name = "Базовая модель рейтинга",
            IsActive = true,
            ActivatedAtUtc = _dateTimeProvider.UtcNow,
            Notes = "Auto-generated baseline model."
        };

        foreach (var pair in ContractorRatingScoringPolicy.DefaultWeights)
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

    public async Task<ContractorRatingModelVersion> UpsertActiveModelAsync(
        UpsertContractorRatingModelRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var normalizedWeights = ContractorRatingModelRequestPolicy.NormalizeWeights(request.Weights);
        var utcNow = _dateTimeProvider.UtcNow;

        var activeModel = await _dbContext.Set<ContractorRatingModelVersion>()
            .Include(x => x.Weights)
            .FirstOrDefaultAsync(x => x.IsActive, cancellationToken);

        if (activeModel is not null)
        {
            activeModel.IsActive = false;
        }

        var baseVersionCode = ContractorRatingModelRequestPolicy.NormalizeVersionCode(request.VersionCode) ?? $"R-{utcNow:yyyyMMddHHmmss}";
        var versionCode = await EnsureUniqueVersionCodeAsync(baseVersionCode, cancellationToken);

        var model = new ContractorRatingModelVersion
        {
            VersionCode = versionCode,
            Name = ContractorRatingModelRequestPolicy.NormalizeRequiredText(request.Name) ?? $"Рейтинговая модель {versionCode}",
            IsActive = true,
            ActivatedAtUtc = utcNow,
            Notes = ContractorRatingModelRequestPolicy.NormalizeOptionalText(request.Notes)
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
        return model;
    }

    public async Task<string> EnsureUniqueVersionCodeAsync(string candidate, CancellationToken cancellationToken = default)
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
}
