using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Sla;

public sealed class SlaRule : SoftDeletableEntity
{
    public string PurchaseTypeCode { get; set; } = string.Empty;
    public int WarningDaysBeforeDue { get; set; } = 2;
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}
