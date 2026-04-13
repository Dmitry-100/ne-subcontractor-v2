using Subcontractor.Application.Imports;

namespace Subcontractor.BackgroundJobs.Workers;

public sealed class SourceDataImportProcessingWorker : BackgroundService
{
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan ErrorDelay = TimeSpan.FromSeconds(10);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SourceDataImportProcessingWorker> _logger;

    public SourceDataImportProcessingWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<SourceDataImportProcessingWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var importsService = scope.ServiceProvider.GetRequiredService<ISourceDataImportsService>();
                var xmlInboxService = scope.ServiceProvider.GetRequiredService<IXmlSourceDataImportInboxService>();

                var xmlProcessed = await xmlInboxService.ProcessQueuedAsync(2, stoppingToken);
                var processed = await importsService.ProcessQueuedBatchesAsync(3, stoppingToken);
                var totalProcessed = xmlProcessed + processed;

                if (totalProcessed == 0)
                {
                    await Task.Delay(IdleDelay, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Source-data import processing worker failed.");
                await Task.Delay(ErrorDelay, stoppingToken);
            }
        }
    }
}
