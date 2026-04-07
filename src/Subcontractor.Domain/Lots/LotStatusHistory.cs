using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Lots;

public sealed class LotStatusHistory : AuditableEntity
{
    public Guid LotId { get; set; }
    public Lot Lot { get; set; } = null!;

    public LotStatus? FromStatus { get; set; }
    public LotStatus ToStatus { get; set; }
    public string Reason { get; set; } = string.Empty;
}
