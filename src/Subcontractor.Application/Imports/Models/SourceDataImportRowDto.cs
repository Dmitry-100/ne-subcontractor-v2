namespace Subcontractor.Application.Imports.Models;

public sealed record SourceDataImportRowDto(
    Guid Id,
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
