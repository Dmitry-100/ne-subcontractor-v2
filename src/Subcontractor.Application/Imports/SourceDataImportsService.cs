using System.Text;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

public sealed class SourceDataImportsService : ISourceDataImportsService
{
    private readonly IApplicationDbContext _dbContext;

    public SourceDataImportsService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<SourceDataImportBatchListItemDto>> ListBatchesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.SourceDataImportBatches
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new SourceDataImportBatchListItemDto(
                x.Id,
                x.FileName,
                x.Status,
                x.TotalRows,
                x.ValidRows,
                x.InvalidRows,
                x.CreatedAtUtc,
                x.CreatedBy))
            .ToListAsync(cancellationToken);
    }

    public async Task<SourceDataImportBatchDetailsDto?> GetBatchByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return batch is null ? null : ToDetailsDto(batch);
    }

    public async Task<SourceDataImportBatchDetailsDto> CreateBatchAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var fileName = NormalizeFileName(request.FileName);
        var notes = NormalizeNotes(request.Notes);
        var inputRows = request.Rows?.ToArray() ?? Array.Empty<CreateSourceDataImportRowRequest>();
        if (inputRows.Length == 0)
        {
            throw new ArgumentException("At least one row is required.", nameof(request.Rows));
        }

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
            var normalized = NormalizeRow(inputRows[index], index + 1, existingProjectsSet);
            if (normalized.IsValid)
            {
                validRows++;
            }

            batch.Rows.Add(new SourceDataImportRow
            {
                RowNumber = normalized.RowNumber,
                ProjectCode = normalized.ProjectCode,
                ObjectWbs = normalized.ObjectWbs,
                DisciplineCode = normalized.DisciplineCode,
                ManHours = normalized.ManHours,
                PlannedStartDate = normalized.PlannedStartDate,
                PlannedFinishDate = normalized.PlannedFinishDate,
                IsValid = normalized.IsValid,
                ValidationMessage = normalized.ValidationMessage
            });
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

        return ToDetailsDto(batch);
    }

    public async Task<SourceDataImportBatchDetailsDto> CreateBatchQueuedAsync(
        CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var fileName = NormalizeFileName(request.FileName);
        var notes = NormalizeNotes(request.Notes);
        var inputRows = request.Rows?.ToArray() ?? Array.Empty<CreateSourceDataImportRowRequest>();
        if (inputRows.Length == 0)
        {
            throw new ArgumentException("At least one row is required.", nameof(request.Rows));
        }

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
            var row = inputRows[index];
            batch.Rows.Add(new SourceDataImportRow
            {
                RowNumber = row.RowNumber > 0 ? row.RowNumber : index + 1,
                ProjectCode = (row.ProjectCode ?? string.Empty).Trim().ToUpperInvariant(),
                ObjectWbs = (row.ObjectWbs ?? string.Empty).Trim(),
                DisciplineCode = (row.DisciplineCode ?? string.Empty).Trim().ToUpperInvariant(),
                ManHours = row.ManHours,
                PlannedStartDate = row.PlannedStartDate,
                PlannedFinishDate = row.PlannedFinishDate,
                // Asynchronous processing will set authoritative validation flags later.
                IsValid = true,
                ValidationMessage = null
            });
        }

        batch.StatusHistory.Add(new SourceDataImportBatchStatusHistory
        {
            FromStatus = null,
            ToStatus = SourceDataImportBatchStatus.Uploaded,
            Reason = "Batch uploaded for asynchronous processing."
        });

        await _dbContext.Set<SourceDataImportBatch>().AddAsync(batch, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDetailsDto(batch);
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
        var reason = NormalizeTransitionReason(request.Reason);
        EnsureTransitionAllowed(batch, request.TargetStatus, hasReason);

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

        return ToHistoryDto(history);
    }

    public async Task<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>> GetBatchHistoryAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.SourceDataImportBatchStatusHistory
            .AsNoTracking()
            .Where(x => x.BatchId == id)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new SourceDataImportBatchStatusHistoryItemDto(
                x.Id,
                x.FromStatus,
                x.ToStatus,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<SourceDataImportBatchValidationReportDto?> GetValidationReportAsync(
        Guid id,
        bool includeValidRows,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.Set<SourceDataImportBatch>()
            .AsNoTracking()
            .Include(x => x.Rows)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (batch is null)
        {
            return null;
        }

        var rows = includeValidRows
            ? batch.Rows.OrderBy(x => x.RowNumber).ThenBy(x => x.Id)
            : batch.Rows.Where(x => !x.IsValid).OrderBy(x => x.RowNumber).ThenBy(x => x.Id);

        var builder = new StringBuilder();
        builder.AppendLine("BatchId,FileName,Status,RowNumber,ProjectCode,ObjectWbs,DisciplineCode,ManHours,PlannedStartDate,PlannedFinishDate,IsValid,ValidationMessage");

        foreach (var row in rows)
        {
            builder
                .Append(EscapeCsv(batch.Id)).Append(',')
                .Append(EscapeCsv(batch.FileName)).Append(',')
                .Append(EscapeCsv(batch.Status.ToString())).Append(',')
                .Append(EscapeCsv(row.RowNumber)).Append(',')
                .Append(EscapeCsv(row.ProjectCode)).Append(',')
                .Append(EscapeCsv(row.ObjectWbs)).Append(',')
                .Append(EscapeCsv(row.DisciplineCode)).Append(',')
                .Append(EscapeCsv(row.ManHours)).Append(',')
                .Append(EscapeCsv(row.PlannedStartDate?.ToString("yyyy-MM-dd"))).Append(',')
                .Append(EscapeCsv(row.PlannedFinishDate?.ToString("yyyy-MM-dd"))).Append(',')
                .Append(EscapeCsv(row.IsValid)).Append(',')
                .Append(EscapeCsv(row.ValidationMessage))
                .AppendLine();
        }

        var originalName = string.IsNullOrWhiteSpace(batch.FileName)
            ? "source-data"
            : Path.GetFileNameWithoutExtension(batch.FileName);
        var normalizedName = string.IsNullOrWhiteSpace(originalName) ? "source-data" : originalName;
        var suffix = includeValidRows ? "full" : "invalid";
        var fileName = $"{normalizedName}-validation-{suffix}-{batch.Id:N}.csv";

        return new SourceDataImportBatchValidationReportDto(fileName, builder.ToString());
    }

    public async Task<SourceDataImportLotReconciliationReportDto?> GetLotReconciliationReportAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.SourceDataImportBatches
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.FileName,
                x.Status
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (batch is null)
        {
            return null;
        }

        var records = await _dbContext.SourceDataLotReconciliationRecords
            .AsNoTracking()
            .Where(x => x.SourceDataImportBatchId == id)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenBy(x => x.RecommendationGroupKey)
            .ThenBy(x => x.Id)
            .Select(x => new
            {
                x.ApplyOperationId,
                x.CreatedAtUtc,
                x.CreatedBy,
                x.RecommendationGroupKey,
                x.ProjectCode,
                x.DisciplineCode,
                x.RequestedLotCode,
                x.RequestedLotName,
                x.SourceRowsCount,
                x.TotalManHours,
                x.PlannedStartDate,
                x.PlannedFinishDate,
                x.IsCreated,
                x.LotId,
                x.SkipReason
            })
            .ToListAsync(cancellationToken);

        var builder = new StringBuilder();
        builder.AppendLine("BatchId,BatchFileName,BatchStatus,ApplyOperationId,AppliedAtUtc,AppliedBy,GroupKey,ProjectCode,DisciplineCode,RequestedLotCode,RequestedLotName,RowsCount,TotalManHours,PlannedStartDate,PlannedFinishDate,Result,LotId,SkipReason");

        foreach (var record in records)
        {
            builder
                .Append(EscapeCsv(batch.Id)).Append(',')
                .Append(EscapeCsv(batch.FileName)).Append(',')
                .Append(EscapeCsv(batch.Status.ToString())).Append(',')
                .Append(EscapeCsv(record.ApplyOperationId)).Append(',')
                .Append(EscapeCsv(record.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture))).Append(',')
                .Append(EscapeCsv(record.CreatedBy)).Append(',')
                .Append(EscapeCsv(record.RecommendationGroupKey)).Append(',')
                .Append(EscapeCsv(record.ProjectCode)).Append(',')
                .Append(EscapeCsv(record.DisciplineCode)).Append(',')
                .Append(EscapeCsv(record.RequestedLotCode)).Append(',')
                .Append(EscapeCsv(record.RequestedLotName)).Append(',')
                .Append(EscapeCsv(record.SourceRowsCount)).Append(',')
                .Append(EscapeCsv(record.TotalManHours)).Append(',')
                .Append(EscapeCsv(record.PlannedStartDate?.ToString("yyyy-MM-dd"))).Append(',')
                .Append(EscapeCsv(record.PlannedFinishDate?.ToString("yyyy-MM-dd"))).Append(',')
                .Append(EscapeCsv(record.IsCreated ? "Created" : "Skipped")).Append(',')
                .Append(EscapeCsv(record.LotId)).Append(',')
                .Append(EscapeCsv(record.SkipReason))
                .AppendLine();
        }

        var originalName = string.IsNullOrWhiteSpace(batch.FileName)
            ? "source-data"
            : Path.GetFileNameWithoutExtension(batch.FileName);
        var normalizedName = string.IsNullOrWhiteSpace(originalName) ? "source-data" : originalName;
        var fileName = $"{normalizedName}-lot-reconciliation-{batch.Id:N}.csv";

        return new SourceDataImportLotReconciliationReportDto(fileName, builder.ToString());
    }

    public async Task<int> ProcessQueuedBatchesAsync(
        int maxBatches = 1,
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
                    Reason = TruncateReason(safeMessage)
                }, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            processedCount++;
        }

        return processedCount;
    }

    private static string NormalizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new ArgumentException("File name is required.", nameof(fileName));
        }

        return fileName.Trim();
    }

    private static string? NormalizeNotes(string? notes)
    {
        var normalized = notes?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string NormalizeTransitionReason(string? reason)
    {
        return string.IsNullOrWhiteSpace(reason)
            ? "Status changed by operator."
            : reason.Trim();
    }

    private static void EnsureTransitionAllowed(
        SourceDataImportBatch batch,
        SourceDataImportBatchStatus targetStatus,
        bool hasReason)
    {
        var current = batch.Status;
        switch (targetStatus)
        {
            case SourceDataImportBatchStatus.ReadyForLotting:
                if (current != SourceDataImportBatchStatus.Validated)
                {
                    throw new InvalidOperationException($"Transition {current} -> {targetStatus} is not allowed.");
                }

                if (batch.InvalidRows > 0)
                {
                    throw new InvalidOperationException("Batch with invalid rows cannot move to ReadyForLotting.");
                }

                return;

            case SourceDataImportBatchStatus.Rejected:
                if (current is SourceDataImportBatchStatus.Validated or SourceDataImportBatchStatus.ValidatedWithErrors or SourceDataImportBatchStatus.ReadyForLotting)
                {
                    if (!hasReason)
                    {
                        throw new ArgumentException("Reason is required for transition to Rejected.", "reason");
                    }

                    return;
                }

                throw new InvalidOperationException($"Transition {current} -> {targetStatus} is not allowed.");

            default:
                throw new InvalidOperationException($"Transition {current} -> {targetStatus} is not allowed.");
        }
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
            var normalized = NormalizeRow(
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

            row.RowNumber = normalized.RowNumber;
            row.ProjectCode = normalized.ProjectCode;
            row.ObjectWbs = normalized.ObjectWbs;
            row.DisciplineCode = normalized.DisciplineCode;
            row.ManHours = normalized.ManHours;
            row.PlannedStartDate = normalized.PlannedStartDate;
            row.PlannedFinishDate = normalized.PlannedFinishDate;
            row.IsValid = normalized.IsValid;
            row.ValidationMessage = normalized.ValidationMessage;

            if (normalized.IsValid)
            {
                validRows++;
            }
        }

        batch.TotalRows = orderedRows.Length;
        batch.ValidRows = validRows;
        batch.InvalidRows = batch.TotalRows - batch.ValidRows;
    }

    private static NormalizedRow NormalizeRow(
        CreateSourceDataImportRowRequest request,
        int fallbackRowNumber,
        IReadOnlySet<string> existingProjectCodes)
    {
        var rowNumber = request.RowNumber > 0 ? request.RowNumber : fallbackRowNumber;
        var projectCode = (request.ProjectCode ?? string.Empty).Trim().ToUpperInvariant();
        var objectWbs = (request.ObjectWbs ?? string.Empty).Trim();
        var disciplineCode = (request.DisciplineCode ?? string.Empty).Trim().ToUpperInvariant();

        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(projectCode))
        {
            errors.Add("projectCode is required");
        }
        else if (!existingProjectCodes.Contains(projectCode))
        {
            errors.Add($"project '{projectCode}' does not exist");
        }

        if (string.IsNullOrWhiteSpace(objectWbs))
        {
            errors.Add("objectWbs is required");
        }

        if (string.IsNullOrWhiteSpace(disciplineCode))
        {
            errors.Add("disciplineCode is required");
        }

        if (request.ManHours < 0)
        {
            errors.Add("manHours must be non-negative");
        }

        if (request.PlannedStartDate.HasValue &&
            request.PlannedFinishDate.HasValue &&
            request.PlannedStartDate.Value.Date > request.PlannedFinishDate.Value.Date)
        {
            errors.Add("plannedStartDate must be <= plannedFinishDate");
        }

        return new NormalizedRow(
            rowNumber,
            projectCode,
            objectWbs,
            disciplineCode,
            request.ManHours,
            request.PlannedStartDate,
            request.PlannedFinishDate,
            errors.Count == 0,
            errors.Count == 0 ? null : string.Join("; ", errors));
    }

    private static SourceDataImportBatchDetailsDto ToDetailsDto(SourceDataImportBatch batch)
    {
        return new SourceDataImportBatchDetailsDto(
            batch.Id,
            batch.FileName,
            batch.Status,
            batch.TotalRows,
            batch.ValidRows,
            batch.InvalidRows,
            batch.Notes,
            batch.CreatedAtUtc,
            batch.CreatedBy,
            batch.Rows
                .OrderBy(x => x.RowNumber)
                .ThenBy(x => x.Id)
                .Select(x => new SourceDataImportRowDto(
                    x.Id,
                    x.RowNumber,
                    x.ProjectCode,
                    x.ObjectWbs,
                    x.DisciplineCode,
                    x.ManHours,
                    x.PlannedStartDate,
                    x.PlannedFinishDate,
                    x.IsValid,
                    x.ValidationMessage))
                .ToArray());
    }

    private static SourceDataImportBatchStatusHistoryItemDto ToHistoryDto(SourceDataImportBatchStatusHistory history)
    {
        return new SourceDataImportBatchStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
    }

    private static string EscapeCsv(object? value)
    {
        var text = value switch
        {
            null => string.Empty,
            bool flag => flag ? "true" : "false",
            decimal number => number.ToString("0.##", CultureInfo.InvariantCulture),
            _ => value.ToString() ?? string.Empty
        };

        if (text.IndexOfAny([',', '"', '\r', '\n']) >= 0)
        {
            return $"\"{text.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
        }

        return text;
    }

    private static string TruncateReason(string value)
    {
        var trimmed = value.Trim();
        return trimmed.Length <= 1024 ? trimmed : trimmed[..1024];
    }

    private sealed record NormalizedRow(
        int RowNumber,
        string ProjectCode,
        string ObjectWbs,
        string DisciplineCode,
        decimal ManHours,
        DateTime? PlannedStartDate,
        DateTime? PlannedFinishDate,
        bool IsValid,
        string? ValidationMessage);
}
