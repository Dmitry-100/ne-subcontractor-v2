namespace Subcontractor.Application.Lots.Models;

public sealed record LotRecommendationGroupDto(
    string GroupKey,
    string SuggestedLotCode,
    string SuggestedLotName,
    string ProjectCode,
    string DisciplineCode,
    int RowsCount,
    decimal TotalManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate,
    IReadOnlyList<LotRecommendationRowDto> Rows);
