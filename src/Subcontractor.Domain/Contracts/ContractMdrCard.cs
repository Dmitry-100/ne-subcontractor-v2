using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Contracts;

public sealed class ContractMdrCard : SoftDeletableEntity
{
    public Guid ContractId { get; set; }
    public Contract Contract { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public DateTime ReportingDate { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }

    public ICollection<ContractMdrRow> Rows { get; set; } = new List<ContractMdrRow>();
}
