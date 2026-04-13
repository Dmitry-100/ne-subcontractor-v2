using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

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
        var normalizedProjectCodes = batch.Rows
            .Select(x => x.ProjectCode?.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var existingProjectCodes = await _dbContext.Projects
            .AsNoTracking()
            .Where(x => normalizedProjectCodes.Contains(x.Code))
            .Select(x => x.Code)
            .ToListAsync(cancellationToken);
        var existingProjectsSet = existingProjectCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var validRows = 0;
        var orderedRows = batch.Rows
            .OrderBy(x => x.RowNumber)
            .ThenBy(x => x.Id)
            .ToArray();

        for (var index = 0; index < orderedRows.Length; index++)
        {
            var row = orderedRows[index];
            var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForValidation(
                new CreateSourceDataImportRowRequest
                {
                    RowNumber = row.RowNumber,
                    ProjectCode = row.ProjectCode,
                    ObjectWbs = row.ObjectWbs,
                    DisciplineCode = row.DisciplineCode,
                    ManHours = row.ManHours,
                    PlannedStartDate = row.PlannedStartDate,
                    PlannedFinishDate = row.PlannedFinishDate
                },
                index + 1,
                existingProjectsSet);
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
}
