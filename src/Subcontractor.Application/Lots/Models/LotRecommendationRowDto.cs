namespace Subcontractor.Application.Lots.Models;

public sealed record LotRecommendationRowDto(
    Guid SourceRowId,
    int RowNumber,
    string ProjectCode,
    string ObjectWbs,
    string DisciplineCode,
    decimal ManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate);
