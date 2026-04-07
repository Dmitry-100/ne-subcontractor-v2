namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractMonitoringControlPointStageDto(
    Guid Id,
    string Name,
    DateTime PlannedDate,
    DateTime? ForecastDate,
    DateTime? ActualDate,
    decimal ProgressPercent,
    int SortOrder,
    string? Notes,
    bool IsDelayed);
