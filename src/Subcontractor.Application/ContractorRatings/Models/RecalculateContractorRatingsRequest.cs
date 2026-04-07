namespace Subcontractor.Application.ContractorRatings.Models;

public sealed class RecalculateContractorRatingsRequest
{
    public Guid? ContractorId { get; set; }
    public bool IncludeInactiveContractors { get; set; }
    public string? Reason { get; set; }
}

