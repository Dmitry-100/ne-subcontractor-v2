namespace Subcontractor.Application.ContractorRatings.Models;

public sealed class UpsertContractorRatingManualAssessmentRequest
{
    public decimal Score { get; set; }
    public string? Comment { get; set; }
}

