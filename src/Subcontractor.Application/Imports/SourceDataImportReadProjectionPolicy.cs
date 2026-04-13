using System.Globalization;
using System.Text;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

internal static class SourceDataImportReadProjectionPolicy
{
    internal static SourceDataImportBatchDetailsDto ToDetailsDto(SourceDataImportBatch batch)
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

    internal static SourceDataImportBatchStatusHistoryItemDto ToHistoryDto(SourceDataImportBatchStatusHistory history)
    {
        return new SourceDataImportBatchStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
    }

    internal static SourceDataImportBatchValidationReportDto BuildValidationReport(
        SourceDataImportBatch batch,
        bool includeValidRows)
    {
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

    internal static SourceDataImportLotReconciliationReportDto BuildLotReconciliationReport(
        SourceDataImportBatchReportSnapshot batch,
        IReadOnlyList<SourceDataImportLotReconciliationReportRow> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine("BatchId,BatchFileName,BatchStatus,ApplyOperationId,AppliedAtUtc,AppliedBy,GroupKey,ProjectCode,DisciplineCode,RequestedLotCode,RequestedLotName,RowsCount,TotalManHours,PlannedStartDate,PlannedFinishDate,Result,LotId,SkipReason");

        foreach (var record in rows)
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
}

internal sealed record SourceDataImportBatchReportSnapshot(
    Guid Id,
    string FileName,
    SourceDataImportBatchStatus Status);

internal sealed record SourceDataImportLotReconciliationReportRow(
    Guid ApplyOperationId,
    DateTimeOffset CreatedAtUtc,
    string CreatedBy,
    string RecommendationGroupKey,
    string ProjectCode,
    string DisciplineCode,
    string RequestedLotCode,
    string RequestedLotName,
    int SourceRowsCount,
    decimal TotalManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate,
    bool IsCreated,
    Guid? LotId,
    string? SkipReason);
