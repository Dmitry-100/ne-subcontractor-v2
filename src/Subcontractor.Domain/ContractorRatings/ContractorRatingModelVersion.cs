using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.ContractorRatings;

public sealed class ContractorRatingModelVersion : SoftDeletableEntity
{
    public string VersionCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? ActivatedAtUtc { get; set; }
    public string? Notes { get; set; }

    public ICollection<ContractorRatingWeight> Weights { get; set; } = new List<ContractorRatingWeight>();
}

