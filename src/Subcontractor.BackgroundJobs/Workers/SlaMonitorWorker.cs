using Microsoft.Extensions.Options;
using Subcontractor.Application.Sla;

namespace Subcontractor.BackgroundJobs.Workers;

public sealed class SlaMonitorWorker : BackgroundService
{
    private static readonly TimeSpan ErrorDelay = TimeSpan.FromSeconds(20);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SlaMonitorWorker> _logger;
    private readonly SlaMonitoringOptions _options;

    public SlaMonitorWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<SlaMonitorWorker> logger,
        IOptions<SlaMonitoringOptions> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_options.WorkerEnabled)
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<ISlaMonitoringService>();
                    var result = await service.RunMonitoringCycleAsync(sendNotifications: true, stoppingToken);
                    _logger.LogInformation(
                        "SLA monitor cycle complete. Active={Active}; Open={Open}; Sent={Sent}; Failed={Failed}",
                        result.ActiveViolations,
                        result.OpenViolations,
                        result.NotificationSuccessCount,
                        result.NotificationFailureCount);
                }

                await Task.Delay(GetPollingInterval(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SLA monitor worker failed.");
                await Task.Delay(ErrorDelay, stoppingToken);
            }
        }
    }

    private TimeSpan GetPollingInterval()
    {
        var minutes = _options.WorkerPollingIntervalMinutes;
        if (minutes < 1)
        {
            minutes = 1;
        }

        if (minutes > 240)
        {
            minutes = 240;
        }

        return TimeSpan.FromMinutes(minutes);
    }
}
