using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

internal static class SourceDataImportRowNormalizationPolicy
{
    internal static NormalizedSourceDataImportRow NormalizeForValidation(
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

        return new NormalizedSourceDataImportRow(
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

    internal static NormalizedSourceDataImportRow NormalizeForQueuedUpload(
        CreateSourceDataImportRowRequest request,
        int fallbackRowNumber)
    {
        var rowNumber = request.RowNumber > 0 ? request.RowNumber : fallbackRowNumber;

        return new NormalizedSourceDataImportRow(
            rowNumber,
            (request.ProjectCode ?? string.Empty).Trim().ToUpperInvariant(),
            (request.ObjectWbs ?? string.Empty).Trim(),
            (request.DisciplineCode ?? string.Empty).Trim().ToUpperInvariant(),
            request.ManHours,
            request.PlannedStartDate,
            request.PlannedFinishDate,
            IsValid: true,
            ValidationMessage: null);
    }

    internal static SourceDataImportRow ToEntity(NormalizedSourceDataImportRow normalized)
    {
        return new SourceDataImportRow
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
        };
    }

    internal static void ApplyToEntity(SourceDataImportRow row, NormalizedSourceDataImportRow normalized)
    {
        row.RowNumber = normalized.RowNumber;
        row.ProjectCode = normalized.ProjectCode;
        row.ObjectWbs = normalized.ObjectWbs;
        row.DisciplineCode = normalized.DisciplineCode;
        row.ManHours = normalized.ManHours;
        row.PlannedStartDate = normalized.PlannedStartDate;
        row.PlannedFinishDate = normalized.PlannedFinishDate;
        row.IsValid = normalized.IsValid;
        row.ValidationMessage = normalized.ValidationMessage;
    }
}

internal sealed record NormalizedSourceDataImportRow(
    int RowNumber,
    string ProjectCode,
    string ObjectWbs,
    string DisciplineCode,
    decimal ManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate,
    bool IsValid,
    string? ValidationMessage);
