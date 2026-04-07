namespace Subcontractor.Application.Contracts.Models;

public sealed record ImportContractMdrForecastFactConflictDto(
    int SourceRowNumber,
    string Code,
    string Message,
    string CardTitle,
    DateTime ReportingDate,
    string RowCode);
