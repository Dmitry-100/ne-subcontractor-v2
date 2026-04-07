using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts.Models;

public sealed record ContractDetailsDto(
    Guid Id,
    Guid LotId,
    Guid ProcedureId,
    Guid ContractorId,
    string? ContractorName,
    string ContractNumber,
    DateTime? SigningDate,
    decimal AmountWithoutVat,
    decimal VatAmount,
    decimal TotalAmount,
    DateTime? StartDate,
    DateTime? EndDate,
    ContractStatus Status);
