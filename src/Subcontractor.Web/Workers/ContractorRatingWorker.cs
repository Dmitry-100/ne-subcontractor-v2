using Microsoft.Extensions.Options;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.ContractorRatings.Models;

namespace Subcontractor.Web.Workers;

public sealed class ContractorRatingWorker : BackgroundService
{
    private static readonly TimeSpan ErrorDelay = TimeSpan.FromSeconds(20);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ContractorRatingWorker> _logger;
    private readonly ContractorRatingOptions _options;

    public ContractorRatingWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<ContractorRatingWorker> logger,
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
                    var service = scope.ServiceProvider.GetRequiredService<IContractorRatingsService>();
                    var result = await service.RecalculateRatingsAsync(
                        new RecalculateContractorRatingsRequest
                        {
                            IncludeInactiveContractors = !_options.AutoRecalculateActiveOnly,
                            Reason = "Worker cycle."
                        },
                        stoppingToken);

                    _logger.LogInformation(
                        "Contractor rating cycle complete. Processed={Processed}; Updated={Updated}; Model={Model}",
                        result.ProcessedContractors,
                        result.UpdatedContractors,
                        result.ModelVersionCode);
                }

                await Task.Delay(GetPollingInterval(), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Contractor rating worker failed.");
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

