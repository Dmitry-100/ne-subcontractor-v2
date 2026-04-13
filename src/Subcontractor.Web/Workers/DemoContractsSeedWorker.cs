using Microsoft.Extensions.Options;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Services;

namespace Subcontractor.Web.Workers;

public sealed class DemoContractsSeedWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IOptions<DemoSeedOptions> _options;
    private readonly ILogger<DemoContractsSeedWorker> _logger;

    public DemoContractsSeedWorker(
        IServiceProvider serviceProvider,
        IOptions<DemoSeedOptions> options,
        ILogger<DemoContractsSeedWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Value.EnableStartupSeed)
        {
            return;
        }

        try
        {
            await using var scope = _serviceProvider.CreateAsyncScope();
            var seedService = scope.ServiceProvider.GetRequiredService<IDemoContractsSmokeSeedService>();
            var result = await seedService.EnsureContractsSmokeSeedAsync(stoppingToken);

            _logger.LogInformation(
                "Demo startup seed completed. Created: {Created}, Prefix: {Prefix}, ContractsWithPrefix: {ContractsCount}.",
                result.Created,
                result.ContractNumberPrefix,
                result.ContractsWithPrefix);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Demo startup seed worker cancelled.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Demo startup seed worker failed.");
        }
    }
}
