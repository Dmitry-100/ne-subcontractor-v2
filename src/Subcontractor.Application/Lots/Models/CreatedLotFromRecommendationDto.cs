namespace Subcontractor.Application.Lots.Models;

public sealed record CreatedLotFromRecommendationDto(
    string GroupKey,
    Guid LotId,
    string LotCode,
    string LotName,
    int ItemsCount,
    decimal TotalManHours);
