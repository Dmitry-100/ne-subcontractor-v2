namespace Subcontractor.Domain.Lots;

public sealed class LotItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LotId { get; set; }
    public Lot Lot { get; set; } = null!;

    public Guid ProjectId { get; set; }
    public string ObjectWbs { get; set; } = string.Empty;
    public string DisciplineCode { get; set; } = string.Empty;
    public decimal ManHours { get; set; }
    public DateTime? PlannedStartDate { get; set; }
    public DateTime? PlannedFinishDate { get; set; }
}

