using Subcontractor.Application.Imports.Models;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Imports;

internal static class SourceDataImportRowNormalizationPolicy
{
    internal static NormalizedSourceDataImportRow NormalizeForValidation(
        CreateSourceDataImportRowRequest request,
        int fallbackRowNumber,
        IReadOnlySet<string> existingProjectCodes,
        IReadOnlyDictionary<string, IReadOnlyList<string>>? mappingsByResource = null)
    {
        var rowNumber = request.RowNumber > 0 ? request.RowNumber : fallbackRowNumber;
        var projectCode = (request.ProjectCode ?? string.Empty).Trim().ToUpperInvariant();
        var projectName = DisciplineMappingPolicy.NormalizeDisplayText(request.ProjectName);
        var complexProjectName = DisciplineMappingPolicy.NormalizeDisplayText(request.ComplexProjectName);
        var objectWbs = (request.ObjectWbs ?? string.Empty).Trim();
        var resourceDisciplineName = DisciplineMappingPolicy.NormalizeDisplayText(request.ResourceDisciplineName);
        var disciplineResolution = DisciplineMappingPolicy.ResolveProjectDiscipline(
            NormalizeDisciplineCode(request.DisciplineCode),
            resourceDisciplineName,
            mappingsByResource ?? EmptyDisciplineMappings);
        var disciplineCode = NormalizeDisciplineCode(disciplineResolution.ProjectDisciplineName);
        var branchOfficeName = DisciplineMappingPolicy.NormalizeDisplayText(request.BranchOfficeName);
        var gipName = DisciplineMappingPolicy.NormalizeDisplayText(request.GipName);

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

        if (!string.IsNullOrWhiteSpace(disciplineResolution.ErrorMessage))
        {
            errors.Add(disciplineResolution.ErrorMessage);
        }
        else if (string.IsNullOrWhiteSpace(disciplineCode))
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
            projectName,
            complexProjectName,
            objectWbs,
            disciplineCode,
            resourceDisciplineName,
            branchOfficeName,
            gipName,
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
            DisciplineMappingPolicy.NormalizeDisplayText(request.ProjectName),
            DisciplineMappingPolicy.NormalizeDisplayText(request.ComplexProjectName),
            (request.ObjectWbs ?? string.Empty).Trim(),
            NormalizeDisciplineCode(request.DisciplineCode),
            DisciplineMappingPolicy.NormalizeDisplayText(request.ResourceDisciplineName),
            DisciplineMappingPolicy.NormalizeDisplayText(request.BranchOfficeName),
            DisciplineMappingPolicy.NormalizeDisplayText(request.GipName),
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
            ProjectName = normalized.ProjectName,
            ComplexProjectName = normalized.ComplexProjectName,
            ObjectWbs = normalized.ObjectWbs,
            DisciplineCode = normalized.DisciplineCode,
            ResourceDisciplineName = normalized.ResourceDisciplineName,
            BranchOfficeName = normalized.BranchOfficeName,
            GipName = normalized.GipName,
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
        row.ProjectName = normalized.ProjectName;
        row.ComplexProjectName = normalized.ComplexProjectName;
        row.ObjectWbs = normalized.ObjectWbs;
        row.DisciplineCode = normalized.DisciplineCode;
        row.ResourceDisciplineName = normalized.ResourceDisciplineName;
        row.BranchOfficeName = normalized.BranchOfficeName;
        row.GipName = normalized.GipName;
        row.ManHours = normalized.ManHours;
        row.PlannedStartDate = normalized.PlannedStartDate;
        row.PlannedFinishDate = normalized.PlannedFinishDate;
        row.IsValid = normalized.IsValid;
        row.ValidationMessage = normalized.ValidationMessage;
    }

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> EmptyDisciplineMappings =
        new Dictionary<string, IReadOnlyList<string>>(StringComparer.OrdinalIgnoreCase);

    private static string NormalizeDisciplineCode(string? value)
    {
        var normalized = DisciplineMappingPolicy.NormalizeDisplayText(value);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return string.Empty;
        }

        return normalized.Any(x => x > 127 || char.IsWhiteSpace(x))
            ? normalized
            : normalized.ToUpperInvariant();
    }
}

internal sealed record NormalizedSourceDataImportRow(
    int RowNumber,
    string ProjectCode,
    string ProjectName,
    string ComplexProjectName,
    string ObjectWbs,
    string DisciplineCode,
    string ResourceDisciplineName,
    string BranchOfficeName,
    string GipName,
    decimal ManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate,
    bool IsValid,
    string? ValidationMessage);
