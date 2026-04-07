using Microsoft.Extensions.Options;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;

namespace Subcontractor.BackgroundJobs.Workers;

public sealed class ContractorRatingRecalculationWorker : BackgroundService
{
    private static readonly TimeSpan ErrorDelay = TimeSpan.FromSeconds(20);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ContractorRatingRecalculationWorker> _logger;
    private readonly ContractorRatingOptions _options;

    public ContractorRatingRecalculationWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<ContractorRatingRecalculationWorker> logger,
        IOptions<ContractorRatingOptions> options)
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
                    var ratingsService = scope.ServiceProvider.GetRequiredService<IContractorRatingsService>();
                    var cycleResult = await ratingsService.RecalculateRatingsAsync(
                        new RecalculateContractorRatingsRequest
                        {
                            IncludeInactiveContractors = !_options.AutoRecalculateActiveOnly,
                            Reason = "BackgroundJobs cycle."
                        },
                        stoppingToken);

                    _logger.LogInformation(
                        "Contractor rating cycle complete. Processed={Processed}; Updated={Updated}; Model={Model}.",
                        cycleResult.ProcessedContractors,
                        cycleResult.UpdatedContractors,
                        cycleResult.ModelVersionCode);
                }

                await Task.Delay(GetPollingInterval(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Contractor rating background cycle failed.");
                await Task.Delay(ErrorDelay, stoppingToken);
            }
        }
    }

    private TimeSpan GetPollingInterval()
    {
        var minutes = _options.WorkerPollingIntervalMinutes;
        if (minutes < 5)
        {
            minutes = 5;
        }

        if (minutes > 1440)
        {
            minutes = 1440;
        }

        return TimeSpan.FromMinutes(minutes);
    }
}
