using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Lots;

public sealed class LotRecommendationGroupingService
{
    private readonly IApplicationDbContext _dbContext;

    public LotRecommendationGroupingService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<LotRecommendationGroup>> BuildGroupsAsync(
        SourceDataImportBatch batch,
        CancellationToken cancellationToken = default)
    {
        var candidateRows = batch.Rows
            .Where(x => x.IsValid)
            .OrderBy(x => x.RowNumber)
            .ThenBy(x => x.Id)
            .ToArray();
        if (candidateRows.Length == 0)
        {
            return Array.Empty<LotRecommendationGroup>();
        }

        var projectCodes = candidateRows
            .Select(x => x.ProjectCode.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var projects = await _dbContext.Projects
            .AsNoTracking()
            .Where(x => projectCodes.Contains(x.Code))
            .Select(x => new { x.Id, x.Code })
            .ToListAsync(cancellationToken);
        var projectsByCode = projects.ToDictionary(x => x.Code, x => x.Id, StringComparer.OrdinalIgnoreCase);

        var groupedRows = candidateRows
            .Select(x =>
            {
                var normalizedProjectCode = x.ProjectCode.Trim().ToUpperInvariant();
                var normalizedDiscipline = x.DisciplineCode.Trim().ToUpperInvariant();
                return new LotRecommendationItem(
                    x.Id,
                    x.RowNumber,
                    normalizedProjectCode,
                    projectsByCode.TryGetValue(normalizedProjectCode, out var projectId) ? projectId : null,
                    x.ObjectWbs,
                    normalizedDiscipline,
                    x.ManHours,
                    x.PlannedStartDate,
                    x.PlannedFinishDate);
            })
            .GroupBy(x => new { x.ProjectCode, x.DisciplineCode })
            .OrderBy(x => x.Key.ProjectCode)
            .ThenBy(x => x.Key.DisciplineCode)
            .ToArray();

        var groups = new List<LotRecommendationGroup>(groupedRows.Length);
        var suggestedCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var index = 0;
        foreach (var group in groupedRows)
        {
            index++;
            var groupItems = group
                .OrderBy(x => x.RowNumber)
                .ThenBy(x => x.SourceRowId)
                .ToArray();
            var groupKey = LotRecommendationPolicy.BuildGroupKey(group.Key.ProjectCode, group.Key.DisciplineCode);
            var suggestedCode = LotRecommendationPolicy.EnsureUniqueSuggestedCode(
                LotRecommendationPolicy.BuildSuggestedLotCode(group.Key.ProjectCode, group.Key.DisciplineCode, index),
                suggestedCodes);

            groups.Add(new LotRecommendationGroup(
                groupKey,
                suggestedCode,
                LotRecommendationPolicy.BuildSuggestedLotName(group.Key.ProjectCode, group.Key.DisciplineCode, groupItems.Length),
                group.Key.ProjectCode,
                group.Key.DisciplineCode,
                groupItems));
        }

        return groups;
    }

    public static (DateTime? PlannedStartDate, DateTime? PlannedFinishDate) GetGroupDateRange(
        IReadOnlyList<LotRecommendationItem> items)
    {
        var plannedStartDate = items
            .Where(x => x.PlannedStartDate.HasValue)
            .Select(x => x.PlannedStartDate!.Value.Date)
            .Cast<DateTime?>()
            .DefaultIfEmpty(null)
            .Min();
        var plannedFinishDate = items
            .Where(x => x.PlannedFinishDate.HasValue)
            .Select(x => x.PlannedFinishDate!.Value.Date)
            .Cast<DateTime?>()
            .DefaultIfEmpty(null)
            .Max();

        return (plannedStartDate, plannedFinishDate);
    }
}
