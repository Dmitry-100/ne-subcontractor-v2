using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Lots;

public sealed class Lot : SoftDeletableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? ResponsibleCommercialUserId { get; set; }
    public LotStatus Status { get; set; } = LotStatus.Draft;

    public ICollection<LotItem> Items { get; set; } = new List<LotItem>();
}

