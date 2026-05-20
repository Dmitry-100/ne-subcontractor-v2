using Subcontractor.Domain.Imports;

namespace Subcontractor.Application.Projects.Models;

public sealed record ProjectSourceDataRowDto(
    Guid Id,
    int RowNumber,
    string ProjectCode,
    string ComplexProjectName,
    string ProjectName,
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

public sealed record ProjectSourceDataPageDto(
    Guid? BatchId,
    string? BatchFileName,
    SourceDataImportBatchStatus? BatchStatus,
    DateTimeOffset? BatchCreatedAtUtc,
    IReadOnlyList<ProjectSourceDataRowDto> Items,
    int TotalCount,
    int Skip,
    int Take);
