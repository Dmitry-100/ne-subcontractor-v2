using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.Sla;
using Subcontractor.BackgroundJobs.Configuration;
using Subcontractor.BackgroundJobs.Workers;

namespace Subcontractor.Tests.Integration.Security;

public sealed class BackgroundJobsServiceCollectionExtensionsTests
{
    [Fact]
    public void AddSubcontractorBackgroundJobsComposition_ShouldThrow_WhenConfigurationIsNull()
    {
        var services = new ServiceCollection();

        var error = Assert.Throws<ArgumentNullException>(() => services.AddSubcontractorBackgroundJobsComposition(null!));

        Assert.Equal("configuration", error.ParamName);
    }

    [Fact]
    public void AddSubcontractorBackgroundJobsComposition_ShouldRegisterHostedWorkers_AndBindMonitoringOptions()
    {
        var services = new ServiceCollection();
        services.AddLogging();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=SubcontractorV2;Trusted_Connection=True;TrustServerCertificate=True",
                ["SlaMonitoring:WorkerEnabled"] = "true",
                ["SlaMonitoring:WorkerPollingIntervalMinutes"] = "17",
                ["ContractorRating:WorkerEnabled"] = "true",
                ["ContractorRating:WorkerPollingIntervalMinutes"] = "181",
                ["ContractorRating:AutoRecalculateActiveOnly"] = "false"
            })
            .Build();

        services.AddSubcontractorBackgroundJobsComposition(configuration);

        using var provider = services.BuildServiceProvider();
        var slaOptions = provider.GetRequiredService<IOptions<SlaMonitoringOptions>>().Value;
        var contractorOptions = provider.GetRequiredService<IOptions<ContractorRatingOptions>>().Value;

        Assert.True(slaOptions.WorkerEnabled);
        Assert.Equal(17, slaOptions.WorkerPollingIntervalMinutes);

        Assert.True(contractorOptions.WorkerEnabled);
        Assert.Equal(181, contractorOptions.WorkerPollingIntervalMinutes);
        Assert.False(contractorOptions.AutoRecalculateActiveOnly);

        var hostedServiceTypes = services
            .Where(descriptor => descriptor.ServiceType == typeof(IHostedService))
            .Select(descriptor => descriptor.ImplementationType)
            .Where(type => type is not null)
            .Cast<Type>()
            .ToHashSet();

        Assert.Contains(typeof(SourceDataImportProcessingWorker), hostedServiceTypes);
        Assert.Contains(typeof(SlaMonitorWorker), hostedServiceTypes);
        Assert.Contains(typeof(ContractorRatingRecalculationWorker), hostedServiceTypes);
    }
}
