using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

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

        var normalizedProjectCodes = inputRows
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

        var batch = new SourceDataImportBatch
        {
            FileName = fileName,
            Notes = notes
        };

        var validRows = 0;
        for (var index = 0; index < inputRows.Length; index++)
        {
            var normalized = SourceDataImportRowNormalizationPolicy.NormalizeForValidation(inputRows[index], index + 1, existingProjectsSet);
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
}
