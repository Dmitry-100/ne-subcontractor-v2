using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts.Models;

public sealed class CreateContractRequest
{
    public Guid LotId { get; set; }
    public Guid ProcedureId { get; set; }
    public Guid ContractorId { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public DateTime? SigningDate { get; set; }
    public decimal AmountWithoutVat { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ContractStatus Status { get; set; } = ContractStatus.Draft;
}
