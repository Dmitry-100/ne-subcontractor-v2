namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed record ProcedureListPageDto(
    IReadOnlyList<ProcedureListItemDto> Items,
    int TotalCount,
    int Skip,
    int Take);
