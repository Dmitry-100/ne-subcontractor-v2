using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.Contractors.Models;

public sealed record ContractorListItemDto(
    Guid Id,
    string Inn,
    string Name,
    string City,
    ContractorStatus Status,
    ReliabilityClass ReliabilityClass,
    decimal CurrentRating,
    decimal CurrentLoadPercent
);

