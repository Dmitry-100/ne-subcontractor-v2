namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractMdrRowDto(
    Guid Id,
    string RowCode,
    string Description,
    string UnitCode,
    decimal PlanValue,
    decimal ForecastValue,
    decimal FactValue,
    decimal? ForecastDeviationPercent,
    decimal? FactDeviationPercent,
    int SortOrder,
    string? Notes);
