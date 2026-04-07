namespace Subcontractor.Application.Sla;

public sealed class SlaMonitoringOptions
{
    public const string SectionName = "SlaMonitoring";

    public int DefaultWarningDaysBeforeDue { get; set; } = 2;
    public int WorkerPollingIntervalMinutes { get; set; } = 15;
    public bool WorkerEnabled { get; set; } = true;
}
