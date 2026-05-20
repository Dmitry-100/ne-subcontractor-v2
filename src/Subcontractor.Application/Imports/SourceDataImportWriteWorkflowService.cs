using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.ReferenceData;

namespace Subcontractor.Application.Imports;

public sealed class SourceDataImportWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public SourceDataImportWriteWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SourceDataImportBatchDetailsDto> CreateBatchAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedRequest = SourceDataImportBatchRequestPolicy.Normalize(request);
        var fileName = normalizedRequest.FileName;
        var notes = normalizedRequest.Notes;
        var inputRows = normalizedRequest.Rows;

        var existingProjectsSet = await EnsureProjectsImportedAsync(inputRows, cancellationToken);
        var mappingsByResource = await LoadMappingsByResourceAsync(inputRows, cancellationToken);

        var batch = new SourceDataImportBatch
        {
            FileName = fileName,
            Notes = notes
        };

        var validRows = 0;
        for (var index = 0; index < inputRows.Length; index++)
        {
            var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForValidation(
                inputRows[index],
                index + 1,
                existingProjectsSet,
                mappingsByResource);
            if (normalized.IsValid)
            {
                validRows++;
            }

            batch.Rows.Add(SourceDataImportRowNormalizationPolicy.ToEntity(normalized));
        }

        batch.TotalRows = batch.Rows.Count;
        batch.ValidRows = validRows;
        batch.InvalidRows = batch.TotalRows - batch.ValidRows;
        batch.Status = batch.InvalidRows == 0
            ? SourceDataImportBatchStatus.Validated
            : SourceDataImportBatchStatus.ValidatedWithErrors;
        batch.StatusHistory.Add(new SourceDataImportBatchStatusHistory
        {
            FromStatus = null,
            ToStatus = batch.Status,
            Reason = "Batch uploaded and validated."
        });

        await _dbContext.Set<SourceDataImportBatch>().AddAsync(batch, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return SourceDataImportReadProjectionPolicy.ToDetailsDto(batch);
    }

    public async Task<SourceDataImportBatchDetailsDto> CreateBatchQueuedAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedRequest = SourceDataImportBatchRequestPolicy.Normalize(request);
        var fileName = normalizedRequest.FileName;
        var notes = normalizedRequest.Notes;
        var inputRows = normalizedRequest.Rows;

        var batch = new SourceDataImportBatch
        {
            FileName = fileName,
            Notes = notes,
            Status = SourceDataImportBatchStatus.Uploaded,
            TotalRows = inputRows.Length,
            ValidRows = 0,
            InvalidRows = 0
        };

        for (var index = 0; index < inputRows.Length; index++)
        {
            var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForQueuedUpload(inputRows[index], index + 1);
            batch.Rows.Add(SourceDataImportRowNormalizationPolicy.ToEntity(normalized));
        }

        batch.StatusHistory.Add(new SourceDataImportBatchStatusHistory
        {
            FromStatus = null,
            ToStatus = SourceDataImportBatchStatus.Uploaded,
            Reason = "Batch uploaded for asynchronous processing."
        });

        await _dbContext.Set<SourceDataImportBatch>().AddAsync(batch, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return SourceDataImportReadProjectionPolicy.ToDetailsDto(batch);
    }

    public async Task<SourceDataImportBatchStatusHistoryItemDto?> TransitionBatchStatusAsync(
        Guid id,
        SourceDataImportBatchStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (batch is null)
        {
            return null;
        }

        if (batch.Status == request.TargetStatus)
        {
            throw new ArgumentException("Target status must differ from current status.", nameof(request.TargetStatus));
        }

        var hasReason = !string.IsNullOrWhiteSpace(request.Reason);
        var reason = SourceDataImportTransitionPolicy.NormalizeTransitionReason(request.Reason);
        SourceDataImportTransitionPolicy.EnsureTransitionAllowed(
            batch.Status,
            batch.InvalidRows,
            request.TargetStatus,
            hasReason);

        var history = new SourceDataImportBatchStatusHistory
        {
            BatchId = batch.Id,
            FromStatus = batch.Status,
            ToStatus = request.TargetStatus,
            Reason = reason
        };

        batch.Status = request.TargetStatus;
        await _dbContext.Set<SourceDataImportBatchStatusHistory>().AddAsync(history, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return SourceDataImportReadProjectionPolicy.ToHistoryDto(history);
    }

    public async Task<SourceDataImportBatchDetailsDto?> ApplyDisciplineResolutionsAsync(
        Guid id,
        ApplyDisciplineResolutionsRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var items = NormalizeResolutionItems(request);
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (batch is null)
        {
            return null;
        }

        var rowsById = batch.Rows.ToDictionary(x => x.Id);
        foreach (var item in items)
        {
            if (!rowsById.ContainsKey(item.RowId))
            {
                throw new ArgumentException($"Строка импорта '{item.RowId}' не найдена в выбранном пакете.", nameof(request));
            }
        }

        await EnsureResolutionsAllowedAsync(items, rowsById, cancellationToken);

        foreach (var item in items)
        {
            rowsById[item.RowId].DisciplineCode = DisciplineMappingPolicy.NormalizeDisplayText(item.ProjectDisciplineName);
        }

        await RevalidateBatchRowsAsync(batch, cancellationToken);
        var previousStatus = batch.Status;
        var targetStatus = batch.InvalidRows == 0
            ? SourceDataImportBatchStatus.Validated
            : SourceDataImportBatchStatus.ValidatedWithErrors;
        batch.Status = targetStatus;

        if (previousStatus != targetStatus)
        {
            await _dbContext.Set<SourceDataImportBatchStatusHistory>().AddAsync(new SourceDataImportBatchStatusHistory
            {
                BatchId = batch.Id,
                FromStatus = previousStatus,
                ToStatus = targetStatus,
                Reason = "Manual discipline resolutions applied."
            }, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return SourceDataImportReadProjectionPolicy.ToDetailsDto(batch);
    }

    internal async Task<HashSet<string>> EnsureProjectsImportedAsync(
        IReadOnlyCollection<CreateSourceDataImportRowRequest> inputRows,
        CancellationToken cancellationToken = default)
    {
        var rowsByCode = (inputRows ?? Array.Empty<CreateSourceDataImportRowRequest>())
            .Select(x => new
            {
                Code = (x.ProjectCode ?? string.Empty).Trim().ToUpperInvariant(),
                Name = DisciplineMappingPolicy.NormalizeDisplayText(x.ProjectName)
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Code))
            .GroupBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                x => x.Key,
                x => x.Select(item => item.Name).FirstOrDefault(name => !string.IsNullOrWhiteSpace(name)),
                StringComparer.OrdinalIgnoreCase);

        if (rowsByCode.Count == 0)
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }

        var projectCodes = rowsByCode.Keys.ToArray();
        var existingProjectCodes = await _dbContext.Projects
            .Where(x => projectCodes.Contains(x.Code))
            .Select(x => x.Code)
            .ToListAsync(cancellationToken);
        var existingProjectsSet = existingProjectCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var pair in rowsByCode)
        {
            if (existingProjectsSet.Contains(pair.Key) || string.IsNullOrWhiteSpace(pair.Value))
            {
                continue;
            }

            await _dbContext.Set<Project>().AddAsync(new Project
            {
                Code = pair.Key,
                Name = pair.Value
            }, cancellationToken);
            existingProjectsSet.Add(pair.Key);
        }

        return existingProjectsSet;
    }

    internal async Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> LoadMappingsByResourceAsync(
        IReadOnlyCollection<CreateSourceDataImportRowRequest> inputRows,
        CancellationToken cancellationToken = default)
    {
        var resourceNames = (inputRows ?? Array.Empty<CreateSourceDataImportRowRequest>())
            .Select(x => DisciplineMappingPolicy.NormalizeDisplayText(x.ResourceDisciplineName))
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (resourceNames.Length == 0)
        {
            return new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase);
        }

        var mappings = await _dbContext.Set<DisciplineMapping>()
            .AsNoTracking()
            .Where(x => resourceNames.Contains(x.ResourceDisciplineName))
            .Select(x => new
            {
                x.ResourceDisciplineName,
                x.ProjectDisciplineName
            })
            .ToListAsync(cancellationToken);

        return mappings
            .GroupBy(x => x.ResourceDisciplineName, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                x => x.Key,
                x => (IReadOnlyList<string>)x
                    .Select(item => item.ProjectDisciplineName)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(item => item)
                    .ToArray(),
                StringComparer.OrdinalIgnoreCase);
    }

    private async Task RevalidateBatchRowsAsync(SourceDataImportBatch batch, CancellationToken cancellationToken)
    {
        var orderedRows = batch.Rows
            .OrderBy(x => x.RowNumber)
            .ThenBy(x => x.Id)
            .ToArray();
        var inputRows = orderedRows.Select(ToRequest).ToArray();
        var existingProjectsSet = await EnsureProjectsImportedAsync(inputRows, cancellationToken);
        var mappingsByResource = await LoadMappingsByResourceAsync(inputRows, cancellationToken);

        var validRows = 0;
        for (var index = 0; index < orderedRows.Length; index++)
        {
            var row = orderedRows[index];
            var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForValidation(
                ToRequest(row),
                index + 1,
                existingProjectsSet,
                mappingsByResource);
            SourceDataImportRowNormalizationPolicy.ApplyToEntity(row, normalized);
            if (normalized.IsValid)
            {
                validRows++;
            }
        }

        batch.TotalRows = orderedRows.Length;
        batch.ValidRows = validRows;
        batch.InvalidRows = batch.TotalRows - batch.ValidRows;
    }

    private async Task EnsureResolutionsAllowedAsync(
        IReadOnlyList<ApplyDisciplineResolutionItemRequest> items,
        IReadOnlyDictionary<Guid, SourceDataImportRow> rowsById,
        CancellationToken cancellationToken)
    {
        var resourceNames = items
            .Select(x => rowsById[x.RowId].ResourceDisciplineName)
            .Select(DisciplineMappingPolicy.NormalizeDisplayText)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (resourceNames.Length == 0)
        {
            throw new ArgumentException("Для выбранных строк не указана дисциплина-ресурс.", nameof(items));
        }

        var mappings = await _dbContext.Set<DisciplineMapping>()
            .AsNoTracking()
            .Where(x => resourceNames.Contains(x.ResourceDisciplineName))
            .Select(x => new
            {
                x.ResourceDisciplineName,
                x.ProjectDisciplineName
            })
            .ToListAsync(cancellationToken);

        var allowedByResource = mappings
            .GroupBy(x => x.ResourceDisciplineName, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                x => x.Key,
                x => x.Select(item => item.ProjectDisciplineName).ToArray(),
                StringComparer.OrdinalIgnoreCase);

        foreach (var item in items)
        {
            var row = rowsById[item.RowId];
            var resourceName = DisciplineMappingPolicy.NormalizeDisplayText(row.ResourceDisciplineName);
            var projectDisciplineName = DisciplineMappingPolicy.NormalizeDisplayText(item.ProjectDisciplineName);
            if (string.IsNullOrWhiteSpace(projectDisciplineName))
            {
                throw new ArgumentException("Выберите проектную дисциплину для каждой строки.", nameof(items));
            }

            if (!allowedByResource.TryGetValue(resourceName, out var allowedDisciplines) ||
                !allowedDisciplines.Any(x => string.Equals(
                    DisciplineMappingPolicy.NormalizeLookupKey(x),
                    DisciplineMappingPolicy.NormalizeLookupKey(projectDisciplineName),
                    StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException(
                    $"Проектная дисциплина '{projectDisciplineName}' недопустима для дисциплины-ресурса '{resourceName}'.");
            }
        }
    }

    private static ApplyDisciplineResolutionItemRequest[] NormalizeResolutionItems(ApplyDisciplineResolutionsRequest request)
    {
        var items = (request.Items ?? Array.Empty<ApplyDisciplineResolutionItemRequest>())
            .Where(x => x.RowId != Guid.Empty)
            .GroupBy(x => x.RowId)
            .Select(x => x.Last())
            .ToArray();
        if (items.Length == 0)
        {
            throw new ArgumentException("Не переданы строки для сопоставления дисциплин.", nameof(request));
        }

        return items;
    }

    private static CreateSourceDataImportRowRequest ToRequest(SourceDataImportRow row)
    {
        return new CreateSourceDataImportRowRequest
        {
            RowNumber = row.RowNumber,
            ProjectCode = row.ProjectCode,
            ProjectName = row.ProjectName,
            ComplexProjectName = row.ComplexProjectName,
            ObjectWbs = row.ObjectWbs,
            DisciplineCode = row.DisciplineCode,
            ResourceDisciplineName = row.ResourceDisciplineName,
            BranchOfficeName = row.BranchOfficeName,
            GipName = row.GipName,
            ManHours = row.ManHours,
            PlannedStartDate = row.PlannedStartDate,
            PlannedFinishDate = row.PlannedFinishDate
        };
    }
}
