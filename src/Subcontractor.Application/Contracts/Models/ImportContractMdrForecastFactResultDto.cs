namespace Subcontractor.Application.Contracts.Models;

public sealed record ImportContractMdrForecastFactResultDto(
    bool Applied,
    int TotalRows,
    int UpdatedRows,
    int ConflictRows,
    IReadOnlyList<ImportContractMdrForecastFactConflictDto> Conflicts,
    IReadOnlyList<ContractMdrCardDto> Cards);
