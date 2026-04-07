namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractMdrCardDto(
    Guid Id,
    string Title,
    DateTime ReportingDate,
    int SortOrder,
    string? Notes,
    decimal TotalPlanValue,
    decimal TotalForecastValue,
    decimal TotalFactValue,
    decimal? ForecastDeviationPercent,
    decimal? FactDeviationPercent,
    IReadOnlyList<ContractMdrRowDto> Rows);
