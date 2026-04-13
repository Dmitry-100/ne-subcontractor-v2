using System.Globalization;
using System.Text;
using Subcontractor.Application.Exports.Models;

namespace Subcontractor.Application.Exports;

public static class RegistryExportCsvPolicy
{
    private const string CsvContentType = "text/csv; charset=utf-8";

    public static RegistryExportFileDto BuildCsv(
        string filePrefix,
        IReadOnlyList<string> headers,
        IEnumerable<IReadOnlyList<string?>> rows)
    {
        var builder = new StringBuilder(4096);
        AppendRow(builder, headers);
        foreach (var row in rows)
        {
            AppendRow(builder, row);
        }

        var utcNow = DateTime.UtcNow;
        var fileName = $"{filePrefix}-{utcNow:yyyyMMdd-HHmmss}.csv";
        var content = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(builder.ToString());
        return new RegistryExportFileDto(fileName, CsvContentType, content);
    }

    public static string FormatGuid(Guid? value)
    {
        return value?.ToString() ?? string.Empty;
    }

    public static string FormatDate(DateTime? value)
    {
        return value?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty;
    }

    public static string FormatDecimal(decimal value)
    {
        return value.ToString("0.##", CultureInfo.InvariantCulture);
    }

    private static void AppendRow(StringBuilder builder, IReadOnlyList<string?> values)
    {
        for (var i = 0; i < values.Count; i++)
        {
            if (i > 0)
            {
                builder.Append(',');
            }

            builder.Append(EscapeCsv(values[i]));
        }

        builder.AppendLine();
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var hasSpecialSymbols = value.Contains(',') ||
                                value.Contains('"') ||
                                value.Contains('\n') ||
                                value.Contains('\r');
        if (!hasSpecialSymbols)
        {
            return value;
        }

        return $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }
}
