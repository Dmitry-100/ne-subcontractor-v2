namespace Subcontractor.Application.ContractorRatings;

public sealed class ContractorRatingOptions
{
    public const string SectionName = "ContractorRating";

    public int WorkerPollingIntervalMinutes { get; set; } = 240;
    public bool WorkerEnabled { get; set; } = true;
    public bool AutoRecalculateActiveOnly { get; set; } = true;
}

