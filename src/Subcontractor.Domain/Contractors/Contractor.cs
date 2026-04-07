using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Contractors;

public sealed class Contractor : SoftDeletableEntity
{
    public string Inn { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public decimal CapacityHours { get; set; }
    public decimal CurrentRating { get; set; } = 1.0m;
    public decimal CurrentLoadPercent { get; set; }
    public decimal? ManualSupportCoefficient { get; set; }
    public ReliabilityClass ReliabilityClass { get; set; } = ReliabilityClass.New;
    public ContractorStatus Status { get; set; } = ContractorStatus.Active;

    public ICollection<ContractorQualification> Qualifications { get; set; } = new List<ContractorQualification>();
}

