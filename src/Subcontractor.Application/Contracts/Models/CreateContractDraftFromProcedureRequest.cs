namespace Subcontractor.Application.Contracts.Models;

public sealed class CreateContractDraftFromProcedureRequest
{
    public string? ContractNumber { get; set; }
    public DateTime? SigningDate { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
