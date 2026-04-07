using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Contracts;

public sealed class ContractStatusHistory : AuditableEntity
{
    public Guid ContractId { get; set; }
    public Contract Contract { get; set; } = null!;

    public ContractStatus? FromStatus { get; set; }
    public ContractStatus ToStatus { get; set; }
    public string Reason { get; set; } = string.Empty;
}
