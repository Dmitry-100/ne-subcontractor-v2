using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

public sealed class LotRecommendationsService : ILotRecommendationsService
{
    private readonly IApplicationDbContext _dbContext;

    public LotRecommendationsService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LotRecommendationsDto?> BuildFromImportBatchAsync(
        Guid batchId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == batchId, cancellationToken);
        if (batch is null)
        {
            return null;
        }

        var groups = await BuildGroupsAsync(batch, cancellationToken);
        var canApply = batch.Status == SourceDataImportBatchStatus.ReadyForLotting;
        var note = canApply
            ? null
            : "Lot creation is available after batch transition to ReadyForLotting.";

        return new LotRecommendationsDto(
            batch.Id,
            batch.Status,
            canApply,
            note,
            groups.Sum(x => x.Items.Count),
            groups.Select(ToGroupDto).ToArray());
    }

    public async Task<ApplyLotRecommendationsResultDto> ApplyFromImportBatchAsync(
        Guid batchId,
        ApplyLotRecommendationsRequest request,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == batchId, cancellationToken);
        if (batch is null)
        {
            throw new KeyNotFoundException($"Import batch '{batchId}' was not found.");
        }

        if (batch.Status != SourceDataImportBatchStatus.ReadyForLotting)
        {
            throw new InvalidOperationException("Lot creation is allowed only for ReadyForLotting batches.");
        }

        var groups = await BuildGroupsAsync(batch, cancellationToken);
        if (groups.Count == 0)
        {
            return new ApplyLotRecommendationsResultDto(batchId, 0, Array.Empty<CreatedLotFromRecommendationDto>(), Array.Empty<SkippedLotRecommendationDto>());
        }

        var requestedGroups = request.Groups?.ToArray() ?? Array.Empty<ApplyLotRecommendationGroupRequest>();
        var requestedByKey = requestedGroups
            .Where(x => !string.IsNullOrWhiteSpace(x.GroupKey))
            .GroupBy(x => x.GroupKey.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => x.Last(), StringComparer.OrdinalIgnoreCase);

        var selectedGroups = requestedByKey.Count == 0
            ? groups
            : groups.Where(x => requestedByKey.ContainsKey(x.GroupKey)).ToArray();

        var requestedCount = selectedGroups.Count;
        if (requestedCount == 0)
        {
            return new ApplyLotRecommendationsResultDto(batchId, 0, Array.Empty<CreatedLotFromRecommendationDto>(), Array.Empty<SkippedLotRecommendationDto>());
        }

        var existingCodes = await _dbContext.Lots
            .AsNoTracking()
            .Select(x => x.Code)
            .ToListAsync(cancellationToken);
        var usedCodes = existingCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var createdLots = new List<CreatedLotFromRecommendationDto>();
        var skippedGroups = new List<SkippedLotRecommendationDto>();
        var applyOperationId = Guid.NewGuid();

        foreach (var group in selectedGroups)
        {
            var selection = requestedByKey.TryGetValue(group.GroupKey, out var requestGroup)
                ? requestGroup
                : null;

            var lotCode = NormalizeLotCode(selection?.LotCode, group.SuggestedLotCode);
            var lotName = NormalizeLotName(selection?.LotName, group.SuggestedLotName);
            var (plannedStartDate, plannedFinishDate) = GetGroupDateRange(group.Items);
            var totalManHours = group.Items.Sum(x => x.ManHours);

            if (group.Items.Any(x => x.ProjectId is null))
            {
                const string skipReason = "One or more items cannot be mapped to project id.";
                skippedGroups.Add(new SkippedLotRecommendationDto(group.GroupKey, skipReason));
                await _dbContext.Set<SourceDataLotReconciliationRecord>().AddAsync(
                    CreateTraceRecord(
                        batch.Id,
                        applyOperationId,
                        group,
                        lotCode,
                        lotName,
                        totalManHours,
                        plannedStartDate,
                        plannedFinishDate,
                        isCreated: false,
                        lot: null,
                        skipReason),
                    cancellationToken);
                continue;
            }

            if (!usedCodes.Add(lotCode))
            {
                var skipReason = $"Lot code '{lotCode}' already exists.";
                skippedGroups.Add(new SkippedLotRecommendationDto(group.GroupKey, skipReason));
                await _dbContext.Set<SourceDataLotReconciliationRecord>().AddAsync(
                    CreateTraceRecord(
                        batch.Id,
                        applyOperationId,
                        group,
                        lotCode,
                        lotName,
                        totalManHours,
                        plannedStartDate,
                        plannedFinishDate,
                        isCreated: false,
                        lot: null,
                        skipReason),
                    cancellationToken);
                continue;
            }

            var lot = new Lot
            {
                Code = lotCode,
                Name = lotName,
                Status = LotStatus.Draft
            };

            foreach (var item in group.Items)
            {
                lot.Items.Add(new LotItem
                {
                    ProjectId = item.ProjectId!.Value,
                    ObjectWbs = item.ObjectWbs,
                    DisciplineCode = item.DisciplineCode,
                    ManHours = item.ManHours,
                    PlannedStartDate = item.PlannedStartDate,
                    PlannedFinishDate = item.PlannedFinishDate
                });
            }

            await _dbContext.Set<Lot>().AddAsync(lot, cancellationToken);
            await _dbContext.Set<LotStatusHistory>().AddAsync(new LotStatusHistory
            {
                Lot = lot,
                FromStatus = null,
                ToStatus = LotStatus.Draft,
                Reason = $"Created from import batch {batchId} group {group.GroupKey}."
            }, cancellationToken);
            await _dbContext.Set<SourceDataLotReconciliationRecord>().AddAsync(
                CreateTraceRecord(
                    batch.Id,
                    applyOperationId,
                    group,
                    lotCode,
                    lotName,
                    totalManHours,
                    plannedStartDate,
                    plannedFinishDate,
                    isCreated: true,
                    lot,
                    skipReason: null),
                cancellationToken);

            createdLots.Add(new CreatedLotFromRecommendationDto(
                group.GroupKey,
                lot.Id,
                lot.Code,
                lot.Name,
                lot.Items.Count,
                totalManHours));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ApplyLotRecommendationsResultDto(
            batchId,
            requestedCount,
            createdLots,
            skippedGroups);
    }

    private async Task<IReadOnlyList<RecommendationGroup>> BuildGroupsAsync(
        SourceDataImportBatch batch,
        CancellationToken cancellationToken)
    {
        var candidateRows = batch.Rows
            .Where(x => x.IsValid)
            .OrderBy(x => x.RowNumber)
            .ThenBy(x => x.Id)
            .ToArray();
        if (candidateRows.Length == 0)
        {
            return Array.Empty<RecommendationGroup>();
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
                return new RecommendationItem(
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

        var groups = new List<RecommendationGroup>(groupedRows.Length);
        var suggestedCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var index = 0;
        foreach (var group in groupedRows)
        {
            index++;
            var groupItems = group
                .OrderBy(x => x.RowNumber)
                .ThenBy(x => x.SourceRowId)
                .ToArray();
            var groupKey = BuildGroupKey(group.Key.ProjectCode, group.Key.DisciplineCode);
            var suggestedCode = EnsureUniqueSuggestedCode(
                BuildSuggestedLotCode(group.Key.ProjectCode, group.Key.DisciplineCode, index),
                suggestedCodes);

            var minStart = groupItems
                .Where(x => x.PlannedStartDate.HasValue)
                .Select(x => x.PlannedStartDate!.Value.Date)
                .Cast<DateTime?>()
                .DefaultIfEmpty(null)
                .Min();
            var maxFinish = groupItems
                .Where(x => x.PlannedFinishDate.HasValue)
                .Select(x => x.PlannedFinishDate!.Value.Date)
                .Cast<DateTime?>()
                .DefaultIfEmpty(null)
                .Max();

            groups.Add(new RecommendationGroup(
                groupKey,
                suggestedCode,
                BuildSuggestedLotName(group.Key.ProjectCode, group.Key.DisciplineCode, groupItems.Length),
                group.Key.ProjectCode,
                group.Key.DisciplineCode,
                groupItems));
        }

        return groups;
    }

    private static string BuildGroupKey(string projectCode, string disciplineCode)
    {
        return $"{projectCode}|{disciplineCode}";
    }

    private static (DateTime? PlannedStartDate, DateTime? PlannedFinishDate) GetGroupDateRange(
        IReadOnlyList<RecommendationItem> items)
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

    private static string BuildSuggestedLotCode(string projectCode, string disciplineCode, int index)
    {
        var project = NormalizeCodeToken(projectCode, 18);
        var discipline = NormalizeCodeToken(disciplineCode, 18);
        var seed = $"LOT-{project}-{discipline}-{index:00}";
        return seed.Length <= 64 ? seed : seed[..64];
    }

    private static string EnsureUniqueSuggestedCode(string candidate, ISet<string> usedCodes)
    {
        if (usedCodes.Add(candidate))
        {
            return candidate;
        }

        for (var suffix = 2; suffix < 1000; suffix++)
        {
            var prefixLimit = Math.Max(1, 64 - 4);
            var prefix = candidate.Length > prefixLimit ? candidate[..prefixLimit] : candidate;
            var next = $"{prefix}-{suffix:00}";
            if (next.Length > 64)
            {
                next = next[..64];
            }

            if (usedCodes.Add(next))
            {
                return next;
            }
        }

        throw new InvalidOperationException("Unable to build unique suggested lot code.");
    }

    private static string BuildSuggestedLotName(string projectCode, string disciplineCode, int itemsCount)
    {
        var name = $"{projectCode} / {disciplineCode} / {itemsCount} item(s)";
        return name.Length <= 512 ? name : name[..512];
    }

    private static string NormalizeCodeToken(string value, int limit)
    {
        var chars = value
            .Trim()
            .ToUpperInvariant()
            .Select(x => char.IsLetterOrDigit(x) ? x : '-')
            .ToArray();

        var normalized = new string(chars);
        while (normalized.Contains("--", StringComparison.Ordinal))
        {
            normalized = normalized.Replace("--", "-", StringComparison.Ordinal);
        }

        normalized = normalized.Trim('-');
        if (string.IsNullOrWhiteSpace(normalized))
        {
            normalized = "NA";
        }

        return normalized.Length <= limit ? normalized : normalized[..limit];
    }

    private static string NormalizeLotCode(string? requestedCode, string fallbackCode)
    {
        var value = string.IsNullOrWhiteSpace(requestedCode) ? fallbackCode : requestedCode.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Lot code cannot be empty.", nameof(requestedCode));
        }

        if (value.Length > 64)
        {
            value = value[..64];
        }

        return value;
    }

    private static string NormalizeLotName(string? requestedName, string fallbackName)
    {
        var value = string.IsNullOrWhiteSpace(requestedName) ? fallbackName : requestedName.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Lot name cannot be empty.", nameof(requestedName));
        }

        return value.Length <= 512 ? value : value[..512];
    }

    private static LotRecommendationGroupDto ToGroupDto(RecommendationGroup group)
    {
        var totalManHours = group.Items.Sum(x => x.ManHours);
        var (minStart, maxFinish) = GetGroupDateRange(group.Items);

        return new LotRecommendationGroupDto(
            group.GroupKey,
            group.SuggestedLotCode,
            group.SuggestedLotName,
            group.ProjectCode,
            group.DisciplineCode,
            group.Items.Count,
            totalManHours,
            minStart,
            maxFinish,
            group.Items
                .Select(x => new LotRecommendationRowDto(
                    x.SourceRowId,
                    x.RowNumber,
                    x.ProjectCode,
                    x.ObjectWbs,
                    x.DisciplineCode,
                    x.ManHours,
                    x.PlannedStartDate,
                    x.PlannedFinishDate))
                .ToArray());
    }

    private static SourceDataLotReconciliationRecord CreateTraceRecord(
        Guid batchId,
        Guid applyOperationId,
        RecommendationGroup group,
        string lotCode,
        string lotName,
        decimal totalManHours,
        DateTime? plannedStartDate,
        DateTime? plannedFinishDate,
        bool isCreated,
        Lot? lot,
        string? skipReason)
    {
        return new SourceDataLotReconciliationRecord
        {
            SourceDataImportBatchId = batchId,
            ApplyOperationId = applyOperationId,
            RecommendationGroupKey = group.GroupKey,
            ProjectCode = group.ProjectCode,
            DisciplineCode = group.DisciplineCode,
            RequestedLotCode = lotCode,
            RequestedLotName = lotName,
            SourceRowsCount = group.Items.Count,
            TotalManHours = totalManHours,
            PlannedStartDate = plannedStartDate,
            PlannedFinishDate = plannedFinishDate,
            IsCreated = isCreated,
            Lot = lot,
            SkipReason = skipReason
        };
    }

    private sealed record RecommendationGroup(
        string GroupKey,
        string SuggestedLotCode,
        string SuggestedLotName,
        string ProjectCode,
        string DisciplineCode,
        IReadOnlyList<RecommendationItem> Items);

    private sealed record RecommendationItem(
        Guid SourceRowId,
        int RowNumber,
        string ProjectCode,
        Guid? ProjectId,
        string ObjectWbs,
        string DisciplineCode,
        decimal ManHours,
        DateTime? PlannedStartDate,
        DateTime? PlannedFinishDate);
}
