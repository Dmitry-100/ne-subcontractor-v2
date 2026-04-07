using Subcontractor.Domain.Common;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Domain.ContractorRatings;

public sealed class ContractorRatingManualAssessment : AuditableEntity
{
    public Guid ContractorId { get; set; }
    public Contractor Contractor { get; set; } = null!;

    public Guid ModelVersionId { get; set; }
    public ContractorRatingModelVersion ModelVersion { get; set; } = null!;

    public decimal Score { get; set; }
    public string? Comment { get; set; }
}

