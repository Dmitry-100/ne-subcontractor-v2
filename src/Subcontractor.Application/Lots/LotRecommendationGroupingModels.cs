namespace Subcontractor.Application.Lots;

public sealed record LotRecommendationGroup(
    string GroupKey,
    string SuggestedLotCode,
    string SuggestedLotName,
    string ProjectCode,
    string DisciplineCode,
    IReadOnlyList<LotRecommendationItem> Items);

public sealed record LotRecommendationItem(
    Guid SourceRowId,
    int RowNumber,
    string ProjectCode,
    Guid? ProjectId,
    string ObjectWbs,
    string DisciplineCode,
    decimal ManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate);
