using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

public static class SourceDataImportBatchRequestPolicy
{
    public static (string FileName, string? Notes, CreateSourceDataImportRowRequest[] Rows) Normalize(
        CreateSourceDataImportBatchRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var fileName = NormalizeFileName(request.FileName);
        var notes = NormalizeNotes(request.Notes);
        var rows = request.Rows?.ToArray() ?? Array.Empty<CreateSourceDataImportRowRequest>();
        if (rows.Length == 0)
        {
            throw new ArgumentException("At least one row is required.", nameof(request.Rows));
        }

        return (fileName, notes, rows);
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
}
