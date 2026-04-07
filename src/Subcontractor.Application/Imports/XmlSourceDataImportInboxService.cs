using System.Globalization;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

public sealed class XmlSourceDataImportInboxService : IXmlSourceDataImportInboxService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ISourceDataImportsService _sourceDataImportsService;
    private readonly IDateTimeProvider _dateTimeProvider;

    public XmlSourceDataImportInboxService(
        IApplicationDbContext dbContext,
        ISourceDataImportsService sourceDataImportsService,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _sourceDataImportsService = sourceDataImportsService;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<XmlSourceDataImportInboxItemDto> QueueAsync(
        CreateXmlSourceDataImportInboxItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var fileName = NormalizeFileName(request.FileName);
        var sourceSystem = NormalizeSourceSystem(request.SourceSystem);
        var externalDocumentId = NormalizeExternalDocumentId(request.ExternalDocumentId);
        var xmlContent = NormalizeXmlContent(request.XmlContent);

        EnsureWellFormedXml(xmlContent);

        var item = new XmlSourceDataImportInboxItem
        {
            SourceSystem = sourceSystem,
            ExternalDocumentId = externalDocumentId,
            FileName = fileName,
            XmlContent = xmlContent,
            Status = XmlSourceDataImportInboxStatus.Received
        };

        await _dbContext.Set<XmlSourceDataImportInboxItem>().AddAsync(item, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(item);
    }

    public async Task<IReadOnlyList<XmlSourceDataImportInboxItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.XmlSourceDataImportInboxItems
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new XmlSourceDataImportInboxItemDto(
                x.Id,
                x.SourceSystem,
                x.ExternalDocumentId,
                x.FileName,
                x.Status,
                x.SourceDataImportBatchId,
                x.ErrorMessage,
                x.CreatedAtUtc,
                x.CreatedBy,
                x.ProcessedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<XmlSourceDataImportInboxItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.Set<XmlSourceDataImportInboxItem>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return item is null ? null : ToDto(item);
    }

    public async Task<XmlSourceDataImportInboxItemDto?> RetryAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.Set<XmlSourceDataImportInboxItem>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item is null)
        {
            return null;
        }

        if (item.Status != XmlSourceDataImportInboxStatus.Failed)
        {
            throw new InvalidOperationException("Only failed XML inbox items can be retried.");
        }

        item.Status = XmlSourceDataImportInboxStatus.Received;
        item.ErrorMessage = null;
        item.SourceDataImportBatchId = null;
        item.ProcessedAtUtc = null;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(item);
    }

    public async Task<int> ProcessQueuedAsync(int maxItems = 1, CancellationToken cancellationToken = default)
    {
        if (maxItems <= 0)
        {
            throw new ArgumentException("maxItems must be greater than zero.", nameof(maxItems));
        }

        var processedCount = 0;
        while (processedCount < maxItems && !cancellationToken.IsCancellationRequested)
        {
            var item = await _dbContext.Set<XmlSourceDataImportInboxItem>()
                .OrderBy(x => x.CreatedAtUtc)
                .FirstOrDefaultAsync(x => x.Status == XmlSourceDataImportInboxStatus.Received, cancellationToken);
            if (item is null)
            {
                break;
            }

            try
            {
                item.Status = XmlSourceDataImportInboxStatus.Processing;
                item.ErrorMessage = null;
                await _dbContext.SaveChangesAsync(cancellationToken);

                var rows = ParseRows(item.XmlContent);
                if (rows.Count == 0)
                {
                    throw new InvalidOperationException("XML does not contain import rows.");
                }

                var createdBatch = await _sourceDataImportsService.CreateBatchQueuedAsync(new CreateSourceDataImportBatchRequest
                {
                    FileName = item.FileName,
                    Notes = BuildBatchNotes(item),
                    Rows = rows
                }, cancellationToken);

                item.Status = XmlSourceDataImportInboxStatus.Completed;
                item.SourceDataImportBatchId = createdBatch.Id;
                item.ProcessedAtUtc = _dateTimeProvider.UtcNow;
                item.ErrorMessage = null;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                item.Status = XmlSourceDataImportInboxStatus.Failed;
                item.ErrorMessage = TruncateError(ex.Message);
                item.ProcessedAtUtc = _dateTimeProvider.UtcNow;
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

    private static string NormalizeSourceSystem(string sourceSystem)
    {
        var normalized = sourceSystem?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? "ExpressPlanning" : normalized;
    }

    private static string? NormalizeExternalDocumentId(string? externalDocumentId)
    {
        var normalized = externalDocumentId?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string NormalizeXmlContent(string xmlContent)
    {
        if (string.IsNullOrWhiteSpace(xmlContent))
        {
            throw new ArgumentException("XML content is required.", nameof(xmlContent));
        }

        return xmlContent.Trim();
    }

    private static void EnsureWellFormedXml(string xmlContent)
    {
        try
        {
            _ = XDocument.Parse(xmlContent, LoadOptions.None);
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"Invalid XML payload: {ex.Message}", nameof(xmlContent));
        }
    }

    private static IReadOnlyCollection<CreateSourceDataImportRowRequest> ParseRows(string xmlContent)
    {
        var document = XDocument.Parse(xmlContent, LoadOptions.None);
        var rowNodes = document
            .Descendants()
            .Where(x => IsNodeName(x, "row") || IsNodeName(x, "item") || IsNodeName(x, "work"))
            .ToArray();

        if (rowNodes.Length == 0 && document.Root is not null && LooksLikeRowNode(document.Root))
        {
            rowNodes = [document.Root];
        }

        var rows = new List<CreateSourceDataImportRowRequest>();
        for (var index = 0; index < rowNodes.Length; index++)
        {
            var node = rowNodes[index];
            var rowNumber = ParseInt(GetValue(node, "rowNumber", "RowNumber", "lineNumber", "LineNumber"), index + 1);
            var projectCode = GetValue(node, "projectCode", "ProjectCode", "project");
            var objectWbs = GetValue(node, "objectWbs", "ObjectWbs", "wbs");
            var disciplineCode = GetValue(node, "disciplineCode", "DisciplineCode", "discipline");
            var manHours = ParseDecimal(GetValue(node, "manHours", "ManHours", "laborHours", "hours"), 0m);
            var plannedStartDate = ParseDate(GetValue(node, "plannedStartDate", "PlannedStartDate", "startDate"));
            var plannedFinishDate = ParseDate(GetValue(node, "plannedFinishDate", "PlannedFinishDate", "finishDate", "endDate"));

            rows.Add(new CreateSourceDataImportRowRequest
            {
                RowNumber = rowNumber,
                ProjectCode = projectCode,
                ObjectWbs = objectWbs,
                DisciplineCode = disciplineCode,
                ManHours = manHours,
                PlannedStartDate = plannedStartDate,
                PlannedFinishDate = plannedFinishDate
            });
        }

        return rows;
    }

    private static bool IsNodeName(XElement element, string name)
    {
        return string.Equals(element.Name.LocalName, name, StringComparison.OrdinalIgnoreCase);
    }

    private static bool LooksLikeRowNode(XElement element)
    {
        return !string.IsNullOrWhiteSpace(GetValue(element, "projectCode", "ProjectCode", "project")) &&
               !string.IsNullOrWhiteSpace(GetValue(element, "objectWbs", "ObjectWbs", "wbs"));
    }

    private static string GetValue(XElement node, params string[] keys)
    {
        foreach (var key in keys)
        {
            var attribute = node.Attributes()
                .FirstOrDefault(x => string.Equals(x.Name.LocalName, key, StringComparison.OrdinalIgnoreCase));
            if (attribute is not null)
            {
                return attribute.Value.Trim();
            }

            var child = node.Elements()
                .FirstOrDefault(x => string.Equals(x.Name.LocalName, key, StringComparison.OrdinalIgnoreCase));
            if (child is not null)
            {
                return child.Value.Trim();
            }
        }

        return string.Empty;
    }

    private static int ParseInt(string value, int fallback)
    {
        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed > 0
            ? parsed
            : fallback;
    }

    private static decimal ParseDecimal(string value, decimal fallback)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return fallback;
        }

        if (decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedInvariant))
        {
            return parsedInvariant;
        }

        normalized = normalized.Replace(',', '.');
        return decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : fallback;
    }

    private static DateTime? ParseDate(string value)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        if (DateTime.TryParseExact(
            normalized,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var exact))
        {
            return exact.Date;
        }

        return DateTime.TryParse(
            normalized,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsed)
            ? parsed.Date
            : null;
    }

    private static string? BuildBatchNotes(XmlSourceDataImportInboxItem item)
    {
        var notes = new List<string>
        {
            $"XML SourceSystem: {item.SourceSystem}"
        };

        if (!string.IsNullOrWhiteSpace(item.ExternalDocumentId))
        {
            notes.Add($"ExternalDocumentId: {item.ExternalDocumentId}");
        }

        return string.Join("; ", notes);
    }

    private static string TruncateError(string? message)
    {
        var normalized = string.IsNullOrWhiteSpace(message) ? "XML processing failed." : message.Trim();
        return normalized.Length <= 2000 ? normalized : normalized[..2000];
    }

    private static XmlSourceDataImportInboxItemDto ToDto(XmlSourceDataImportInboxItem item)
    {
        return new XmlSourceDataImportInboxItemDto(
            item.Id,
            item.SourceSystem,
            item.ExternalDocumentId,
            item.FileName,
            item.Status,
            item.SourceDataImportBatchId,
            item.ErrorMessage,
            item.CreatedAtUtc,
            item.CreatedBy,
            item.ProcessedAtUtc);
    }
}
