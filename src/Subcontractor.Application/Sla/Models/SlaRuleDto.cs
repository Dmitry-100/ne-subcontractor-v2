namespace Subcontractor.Application.Sla.Models;

public sealed record SlaRuleDto(
    Guid Id,
    string PurchaseTypeCode,
    int WarningDaysBeforeDue,
    bool IsActive,
    string? Description);
