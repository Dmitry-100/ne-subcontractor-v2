using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Dashboard;

public sealed class DashboardImportPipelineQueryService
{
    private static readonly Func<DbContext, IAsyncEnumerable<SourceStatusCountRow>> CompiledSourceStatusCountsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<SourceDataImportBatch>()
                    .AsNoTracking()
                    .GroupBy(x => x.Status)
                    .Select(x => new SourceStatusCountRow(x.Key, x.Count())));

    private static readonly Func<DbContext, IAsyncEnumerable<XmlStatusCountRow>> CompiledXmlStatusCountsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<XmlSourceDataImportInboxItem>()
                    .AsNoTracking()
                    .GroupBy(x => x.Status)
                    .Select(x => new XmlStatusCountRow(x.Key, x.Count())));

    private static readonly Func<DbContext, Task<int>> CompiledSourceInvalidRowsCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<SourceDataImportBatch>()
                    .AsNoTracking()
                    .Where(x =>
                        x.Status == SourceDataImportBatchStatus.ValidatedWithErrors ||
                        x.Status == SourceDataImportBatchStatus.Rejected ||
                        x.Status == SourceDataImportBatchStatus.Failed)
                    .Sum(x => x.InvalidRows));

    private static readonly Func<DbContext, Task<int>> CompiledXmlRetriedPendingCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<XmlSourceDataImportInboxItem>()
                    .AsNoTracking()
                    .Where(x => x.Status == XmlSourceDataImportInboxStatus.Received && x.LastModifiedAtUtc.HasValue)
                    .Count());

    private static readonly Func<DbContext, IAsyncEnumerable<TraceStatusCountRow>> CompiledTraceStatusCountsQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<SourceDataLotReconciliationRecord>()
                    .AsNoTracking()
                    .GroupBy(x => x.IsCreated)
                    .Select(x => new TraceStatusCountRow(x.Key, x.Count())));

    private static readonly Func<DbContext, Task<int>> CompiledTraceCreatedLotsCountQuery =
        EF.CompileAsyncQuery(
            (DbContext dbContext) =>
                dbContext.Set<SourceDataLotReconciliationRecord>()
                    .AsNoTracking()
                    .Where(x => x.IsCreated && x.LotId.HasValue)
                    .Select(x => x.LotId!.Value)
                    .Distinct()
                    .Count());

    private readonly IApplicationDbContext _dbContext;

    public DashboardImportPipelineQueryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DashboardImportPipelineDto> BuildAsync(CancellationToken cancellationToken = default)
    {
        Dictionary<SourceDataImportBatchStatus, int> sourceStatusCounts;
        Dictionary<XmlSourceDataImportInboxStatus, int> xmlStatusCounts;
        int sourceInvalidRowsCount;
        int xmlRetriedPendingCount;
        Dictionary<bool, int> traceStatusCounts;
        int traceCreatedLotsCount;

        if (_dbContext is DbContext efDbContext)
        {
            sourceStatusCounts = await ToDictionaryAsync(
                CompiledSourceStatusCountsQuery(efDbContext),
                item => item.Status,
                item => item.Count,
                cancellationToken);

            xmlStatusCounts = await ToDictionaryAsync(
                CompiledXmlStatusCountsQuery(efDbContext),
                item => item.Status,
                item => item.Count,
                cancellationToken);

            sourceInvalidRowsCount = await CompiledSourceInvalidRowsCountQuery(efDbContext)
                .WaitAsync(cancellationToken);

            xmlRetriedPendingCount = await CompiledXmlRetriedPendingCountQuery(efDbContext)
                .WaitAsync(cancellationToken);

            traceStatusCounts = await ToDictionaryAsync(
                CompiledTraceStatusCountsQuery(efDbContext),
                item => item.IsCreated,
                item => item.Count,
                cancellationToken);

            traceCreatedLotsCount = await CompiledTraceCreatedLotsCountQuery(efDbContext)
                .WaitAsync(cancellationToken);
        }
        else
        {
            sourceStatusCounts = await _dbContext.SourceDataImportBatches
                .AsNoTracking()
                .GroupBy(x => x.Status)
                .Select(x => new { x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

            xmlStatusCounts = await _dbContext.XmlSourceDataImportInboxItems
                .AsNoTracking()
                .GroupBy(x => x.Status)
                .Select(x => new { x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

            sourceInvalidRowsCount = await _dbContext.SourceDataImportBatches
                .AsNoTracking()
                .Where(x =>
                    x.Status == SourceDataImportBatchStatus.ValidatedWithErrors ||
                    x.Status == SourceDataImportBatchStatus.Rejected ||
                    x.Status == SourceDataImportBatchStatus.Failed)
                .SumAsync(x => x.InvalidRows, cancellationToken);

            xmlRetriedPendingCount = await _dbContext.XmlSourceDataImportInboxItems
                .AsNoTracking()
                .Where(x => x.Status == XmlSourceDataImportInboxStatus.Received && x.LastModifiedAtUtc.HasValue)
                .CountAsync(cancellationToken);

            traceStatusCounts = await _dbContext.SourceDataLotReconciliationRecords
                .AsNoTracking()
                .GroupBy(x => x.IsCreated)
                .Select(x => new { x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

            traceCreatedLotsCount = await _dbContext.SourceDataLotReconciliationRecords
                .AsNoTracking()
                .Where(x => x.IsCreated && x.LotId.HasValue)
                .Select(x => x.LotId!.Value)
                .Distinct()
                .CountAsync(cancellationToken);
        }

        var sourceUploadedCount = sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Uploaded);
        var sourceProcessingCount = sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Processing);
        var traceCreatedGroupsCount = traceStatusCounts.GetValueOrDefault(true);
        var traceSkippedGroupsCount = traceStatusCounts.GetValueOrDefault(false);
        var traceAppliedGroupsCount = traceCreatedGroupsCount + traceSkippedGroupsCount;

        return new DashboardImportPipelineDto(
            sourceUploadedCount,
            sourceProcessingCount,
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.ReadyForLotting),
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.ValidatedWithErrors),
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Failed),
            sourceStatusCounts.GetValueOrDefault(SourceDataImportBatchStatus.Rejected),
            sourceInvalidRowsCount,
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Received),
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Processing),
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Completed),
            xmlStatusCounts.GetValueOrDefault(XmlSourceDataImportInboxStatus.Failed),
            xmlRetriedPendingCount,
            traceAppliedGroupsCount,
            traceCreatedGroupsCount,
            traceSkippedGroupsCount,
            traceCreatedLotsCount);
    }

    public static DashboardImportPipelineDto CreateEmpty()
    {
        return new DashboardImportPipelineDto(
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0);
    }

    private static async Task<Dictionary<TKey, int>> ToDictionaryAsync<TKey, TItem>(
        IAsyncEnumerable<TItem> source,
        Func<TItem, TKey> keySelector,
        Func<TItem, int> valueSelector,
        CancellationToken cancellationToken)
        where TKey : notnull
    {
        var result = new Dictionary<TKey, int>();
        await foreach (var item in source.WithCancellation(cancellationToken))
        {
            result[keySelector(item)] = valueSelector(item);
        }

        return result;
    }

    private readonly record struct SourceStatusCountRow(SourceDataImportBatchStatus Status, int Count);
    private readonly record struct XmlStatusCountRow(XmlSourceDataImportInboxStatus Status, int Count);
    private readonly record struct TraceStatusCountRow(bool IsCreated, int Count);
}
