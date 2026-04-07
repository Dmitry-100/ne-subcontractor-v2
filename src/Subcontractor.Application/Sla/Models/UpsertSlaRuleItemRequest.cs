namespace Subcontractor.Application.Sla.Models;

public sealed class UpsertSlaRuleItemRequest
{
    public string PurchaseTypeCode { get; set; } = string.Empty;
    public int WarningDaysBeforeDue { get; set; } = 2;
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}
