using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.BackgroundJobs.Workers;
using Subcontractor.Infrastructure;

namespace Subcontractor.BackgroundJobs.Configuration;

public static class BackgroundJobsServiceCollectionExtensions
{
    public static IServiceCollection AddSubcontractorBackgroundJobsComposition(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddApplication();
        services.AddInfrastructure(configuration);
        services.AddHostedService<SourceDataImportProcessingWorker>();
        services.AddHostedService<SlaMonitorWorker>();
        services.AddHostedService<ContractorRatingRecalculationWorker>();

        return services;
    }
}
