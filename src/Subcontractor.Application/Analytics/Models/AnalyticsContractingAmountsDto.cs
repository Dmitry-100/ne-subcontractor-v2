namespace Subcontractor.Application.Analytics.Models;

public sealed record AnalyticsContractingAmountsDto(
    decimal SignedAndActiveTotalAmount,
    decimal ClosedTotalAmount,
    decimal? AverageContractAmount);
