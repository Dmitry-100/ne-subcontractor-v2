namespace Subcontractor.Application.Lots.Models;

public sealed class UpdateLotRequest
{
    public string Name { get; set; } = string.Empty;
    public Guid? ResponsibleCommercialUserId { get; set; }
    public IReadOnlyCollection<UpsertLotItemRequest> Items { get; set; } = Array.Empty<UpsertLotItemRequest>();
}
