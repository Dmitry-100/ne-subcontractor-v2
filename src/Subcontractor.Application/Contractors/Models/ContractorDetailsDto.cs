using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.Contractors.Models;

public sealed record ContractorDetailsDto(
    Guid Id,
    string Inn,
    string Name,
    string City,
    string ContactName,
    string Phone,
    string Email,
    decimal CapacityHours,
    decimal CurrentRating,
    decimal CurrentLoadPercent,
    decimal? ManualSupportCoefficient,
    ReliabilityClass ReliabilityClass,
    ContractorStatus Status,
    IReadOnlyCollection<string> DisciplineCodes
);

