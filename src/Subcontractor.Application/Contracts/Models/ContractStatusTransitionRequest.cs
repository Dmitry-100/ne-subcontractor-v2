using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts.Models;

public sealed class ContractStatusTransitionRequest
{
    public ContractStatus TargetStatus { get; set; }
    public string? Reason { get; set; }
}
