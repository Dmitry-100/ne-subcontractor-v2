using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

public sealed class SourceDataImportReadQueryService
{
    private readonly IApplicationDbContext _dbContext;

    public SourceDataImportReadQueryService(IApplicationDbContext dbContext)
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

        return batch is null ? null : SourceDataImportReadProjectionPolicy.ToDetailsDto(batch);
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

        return SourceDataImportReadProjectionPolicy.BuildValidationReport(batch, includeValidRows);
    }

    public async Task<SourceDataImportLotReconciliationReportDto?> GetLotReconciliationReportAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var batch = await _dbContext.SourceDataImportBatches
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new SourceDataImportBatchReportSnapshot(
                x.Id,
                x.FileName,
                x.Status))
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
            .Select(x => new SourceDataImportLotReconciliationReportRow(
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
                x.SkipReason))
            .ToListAsync(cancellationToken);

        return SourceDataImportReadProjectionPolicy.BuildLotReconciliationReport(batch, records);
    }
}
