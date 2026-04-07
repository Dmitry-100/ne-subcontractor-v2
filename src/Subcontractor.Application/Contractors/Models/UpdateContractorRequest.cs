using System.ComponentModel.DataAnnotations;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.Contractors.Models;

public sealed class UpdateContractorRequest
{
    [Required]
    [MaxLength(512)]
    public string Name { get; init; } = string.Empty;

    [MaxLength(128)]
    public string City { get; init; } = string.Empty;

    [MaxLength(256)]
    public string ContactName { get; init; } = string.Empty;

    [MaxLength(64)]
    public string Phone { get; init; } = string.Empty;

    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; init; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal CapacityHours { get; init; }

    [Range(0, double.MaxValue)]
    public decimal CurrentRating { get; init; } = 1.0m;

    [Range(0, double.MaxValue)]
    public decimal CurrentLoadPercent { get; init; }
    public decimal? ManualSupportCoefficient { get; init; }
    public ReliabilityClass ReliabilityClass { get; init; } = ReliabilityClass.New;
    public ContractorStatus Status { get; init; } = ContractorStatus.Active;
    public IReadOnlyCollection<string> DisciplineCodes { get; init; } = Array.Empty<string>();
}
