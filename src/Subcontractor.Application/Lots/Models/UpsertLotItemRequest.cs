namespace Subcontractor.Application.Lots.Models;

public sealed class UpsertLotItemRequest
{
    public Guid ProjectId { get; set; }
    public string ObjectWbs { get; set; } = string.Empty;
    public string DisciplineCode { get; set; } = string.Empty;
    public decimal ManHours { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedFinishDate { get; set; }
}
