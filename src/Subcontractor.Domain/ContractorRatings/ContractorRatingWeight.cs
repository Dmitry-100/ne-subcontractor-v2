using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.ContractorRatings;

public sealed class ContractorRatingWeight : AuditableEntity
{
    public Guid ModelVersionId { get; set; }
    public ContractorRatingModelVersion ModelVersion { get; set; } = null!;

    public ContractorRatingFactorCode FactorCode { get; set; }
    public decimal Weight { get; set; }
    public string? Notes { get; set; }
}

