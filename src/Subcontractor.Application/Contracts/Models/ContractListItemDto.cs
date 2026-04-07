using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractListItemDto(
    Guid Id,
    string ContractNumber,
    Guid LotId,
    Guid ProcedureId,
    Guid ContractorId,
    string? ContractorName,
    ContractStatus Status,
    DateTime? SigningDate,
    decimal AmountWithoutVat,
    decimal VatAmount,
    decimal TotalAmount,
    DateTime? StartDate,
    DateTime? EndDate);
