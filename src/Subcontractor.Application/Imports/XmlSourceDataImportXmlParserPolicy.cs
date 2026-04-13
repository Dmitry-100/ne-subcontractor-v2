using System.Globalization;
using System.Xml.Linq;
using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

internal static class XmlSourceDataImportXmlParserPolicy
{
    public static IReadOnlyCollection<CreateSourceDataImportRowRequest> ParseRows(string xmlContent)
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

        var hasComma = normalized.Contains(',');
        var hasDot = normalized.Contains('.');
        if (hasComma && !hasDot)
        {
            var commaIndex = normalized.LastIndexOf(',');
            var fractionalDigits = normalized.Length - commaIndex - 1;
            if (fractionalDigits > 0 && fractionalDigits <= 2)
            {
                var decimalCandidate = normalized.Replace(',', '.');
                if (decimal.TryParse(
                    decimalCandidate,
                    NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
                    CultureInfo.InvariantCulture,
                    out var parsedDecimalCandidate))
                {
                    return parsedDecimalCandidate;
                }
            }
        }

        return decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedInvariant)
            ? parsedInvariant
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
}
