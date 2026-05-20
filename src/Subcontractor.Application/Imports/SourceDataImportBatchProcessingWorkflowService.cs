using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.ReferenceData;

namespace Subcontractor.Application.Imports;

public sealed class SourceDataImportBatchProcessingWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public SourceDataImportBatchProcessingWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<int> ProcessQueuedBatchesAsync(
        int maxBatches,
        CancellationToken cancellationToken = default)
    {
        if (maxBatches <= 0)
        {
            throw new ArgumentException("maxBatches must be greater than zero.", nameof(maxBatches));
        }

        var processedCount = 0;
        while (processedCount < maxBatches && !cancellationToken.IsCancellationRequested)
        {
            var batch = await _dbContext.Set<SourceDataImportBatch>()
                .Include(x => x.Rows)
                .OrderBy(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync(x => x.Status == SourceDataImportBatchStatus.Uploaded, cancellationToken);
            if (batch is null)
            {
                break;
            }

            try
            {
                var previousStatus = batch.Status;
                batch.Status = SourceDataImportBatchStatus.Processing;
                await _dbContext.Set<SourceDataImportBatchStatusHistory>().AddAsync(new SourceDataImportBatchStatusHistory
                {
                    BatchId = batch.Id,
                    FromStatus = previousStatus,
                    ToStatus = SourceDataImportBatchStatus.Processing,
                    Reason = "Asynchronous validation started."
                }, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);

                await ValidateBatchRowsAsync(batch, cancellationToken);

                var targetStatus = batch.InvalidRows == 0
                    ? SourceDataImportBatchStatus.Validated
                    : SourceDataImportBatchStatus.ValidatedWithErrors;
                var targetReason = batch.InvalidRows == 0
                    ? "Asynchronous validation completed successfully."
                    : "Asynchronous validation completed with errors.";

                batch.Status = targetStatus;
                await _dbContext.Set<SourceDataImportBatchStatusHistory>().AddAsync(new SourceDataImportBatchStatusHistory
                {
                    BatchId = batch.Id,
                    FromStatus = SourceDataImportBatchStatus.Processing,
                    ToStatus = targetStatus,
                    Reason = targetReason
                }, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                var safeMessage = string.IsNullOrWhiteSpace(ex.Message)
                    ? "Asynchronous validation failed."
                    : $"Asynchronous validation failed: {ex.Message.Trim()}";
                batch.Status = SourceDataImportBatchStatus.Failed;
                await _dbContext.Set<SourceDataImportBatchStatusHistory>().AddAsync(new SourceDataImportBatchStatusHistory
                {
                    BatchId = batch.Id,
                    FromStatus = SourceDataImportBatchStatus.Processing,
                    ToStatus = SourceDataImportBatchStatus.Failed,
                    Reason = SourceDataImportTransitionPolicy.TruncateReason(safeMessage)
                }, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            processedCount++;
        }

        return processedCount;
    }

    private async Task ValidateBatchRowsAsync(SourceDataImportBatch batch, CancellationToken cancellationToken)
    {
        var inputRows = batch.Rows.Select(x => new CreateSourceDataImportRowRequest
        {
            RowNumber = x.RowNumber,
            ProjectCode = x.ProjectCode,
            ProjectName = x.ProjectName,
            ComplexProjectName = x.ComplexProjectName,
            ObjectWbs = x.ObjectWbs,
            DisciplineCode = x.DisciplineCode,
            ResourceDisciplineName = x.ResourceDisciplineName,
            BranchOfficeName = x.BranchOfficeName,
            GipName = x.GipName,
            ManHours = x.ManHours,
            PlannedStartDate = x.PlannedStartDate,
            PlannedFinishDate = x.PlannedFinishDate
        }).ToArray();
        var existingProjectsSet = await EnsureProjectsImportedAsync(inputRows, cancellationToken);
        var mappingsByResource = await LoadMappingsByResourceAsync(inputRows, cancellationToken);

        var validRows = 0;
        var orderedRows = batch.Rows
            .OrderBy(x => x.RowNumber)
            .ThenBy(x => x.Id)
            .ToArray();

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

    private async Task<HashSet<string>> EnsureProjectsImportedAsync(
        IReadOnlyCollection<CreateSourceDataImportRowRequest> inputRows,
        CancellationToken cancellationToken)
    {
        var rowsByCode = inputRows
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

    private async Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> LoadMappingsByResourceAsync(
        IReadOnlyCollection<CreateSourceDataImportRowRequest> inputRows,
        CancellationToken cancellationToken)
    {
        var resourceNames = inputRows
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
            .Select(x => new { x.ResourceDisciplineName, x.ProjectDisciplineName })
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
}
