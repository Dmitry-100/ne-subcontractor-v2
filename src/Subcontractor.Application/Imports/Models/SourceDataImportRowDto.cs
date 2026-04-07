namespace Subcontractor.Application.Imports.Models;

public sealed record SourceDataImportRowDto(
    Guid Id,
    int RowNumber,
    string ProjectCode,
    string ObjectWbs,
    string DisciplineCode,
    decimal ManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate,
    bool IsValid,
    string? ValidationMessage);
