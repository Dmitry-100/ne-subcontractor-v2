namespace Subcontractor.Application.Sla.Models;

public sealed class UpdateSlaRulesRequest
{
    public IReadOnlyList<UpsertSlaRuleItemRequest> Items { get; set; } = Array.Empty<UpsertSlaRuleItemRequest>();
}
