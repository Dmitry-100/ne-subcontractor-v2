namespace Subcontractor.Application.Lots.Models;

public sealed record LotItemDto(
    Guid Id,
    Guid ProjectId,
    string ObjectWbs,
    string DisciplineCode,
    decimal ManHours,
    DateTime? PlannedStartDate,
    DateTime? PlannedFinishDate);
