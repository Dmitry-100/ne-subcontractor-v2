using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.ReferenceData;

namespace Subcontractor.Application.Imports;

public sealed class DisciplineMappingsService : IDisciplineMappingsService
{
    private readonly IApplicationDbContext _dbContext;

    public DisciplineMappingsService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DisciplineMappingDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Set<DisciplineMapping>()
            .AsNoTracking()
            .OrderBy(x => x.ResourceDisciplineName)
            .ThenBy(x => x.ProjectDisciplineName)
            .Select(x => new DisciplineMappingDto(
                x.Id,
                x.ProjectDisciplineGroup,
                x.ProjectDisciplineSection,
                x.ProjectDisciplineName,
                x.ResourceDisciplineName))
            .ToArrayAsync(cancellationToken);
    }

    public async Task<UpsertDisciplineMappingsResultDto> UpsertAsync(
        UpsertDisciplineMappingsRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var normalizedItems = DisciplineMappingPolicy.NormalizeItems(request.Items);
        if (normalizedItems.Length == 0)
        {
            throw new ArgumentException("At least one discipline mapping item is required.", nameof(request.Items));
        }

        var keys = normalizedItems.Select(x => x.MappingKey).ToArray();
        var existing = await _dbContext.Set<DisciplineMapping>()
            .Where(x => keys.Contains(x.MappingKey))
            .ToDictionaryAsync(x => x.MappingKey, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var created = 0;
        var updated = 0;
        foreach (var item in normalizedItems)
        {
            if (existing.TryGetValue(item.MappingKey, out var entity))
            {
                entity.ProjectDisciplineGroup = item.ProjectDisciplineGroup;
                entity.ProjectDisciplineSection = item.ProjectDisciplineSection;
                entity.ProjectDisciplineName = item.ProjectDisciplineName;
                entity.ResourceDisciplineName = item.ResourceDisciplineName;
                updated++;
                continue;
            }

            await _dbContext.Set<DisciplineMapping>().AddAsync(new DisciplineMapping
            {
                MappingKey = item.MappingKey,
                ProjectDisciplineGroup = item.ProjectDisciplineGroup,
                ProjectDisciplineSection = item.ProjectDisciplineSection,
                ProjectDisciplineName = item.ProjectDisciplineName,
                ResourceDisciplineName = item.ResourceDisciplineName
            }, cancellationToken);
            created++;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var savedItems = await _dbContext.Set<DisciplineMapping>()
            .AsNoTracking()
            .Where(x => keys.Contains(x.MappingKey))
            .OrderBy(x => x.ResourceDisciplineName)
            .ThenBy(x => x.ProjectDisciplineName)
            .Select(x => new DisciplineMappingDto(
                x.Id,
                x.ProjectDisciplineGroup,
                x.ProjectDisciplineSection,
                x.ProjectDisciplineName,
                x.ResourceDisciplineName))
            .ToArrayAsync(cancellationToken);

        return new UpsertDisciplineMappingsResultDto(normalizedItems.Length, created, updated, savedItems);
    }
}
