using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Services;
using Subcontractor.Web.Workers;

namespace Subcontractor.Tests.Integration.Security;

public sealed class WebServiceCollectionExtensionsTests
{
    [Fact]
    public void AddSubcontractorWebComposition_ShouldThrow_WhenConfigurationIsNull()
    {
        var services = new ServiceCollection();

        var error = Assert.Throws<ArgumentNullException>(() => services.AddSubcontractorWebComposition(null!));

        Assert.Equal("configuration", error.ParamName);
    }

    [Fact]
    public void AddSubcontractorWebComposition_ShouldRegisterOptionsLocalizationAndJsonConverters()
    {
        var services = new ServiceCollection();
        services.AddLogging();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DemoSeed:EnableApi"] = "true",
                ["DemoSeed:EnableStartupSeed"] = "true",
                ["DemoSeed:ContractsPrefix"] = "DEMO",
                ["WebHostTopology:EnableEmbeddedWorkers"] = "true",
                ["WebHostTopology:EnableDemoSeedWorker"] = "true"
            })
            .Build();

        services.AddSubcontractorWebComposition(configuration);

        using var provider = services.BuildServiceProvider();

        var demoSeedOptions = provider.GetRequiredService<IOptions<DemoSeedOptions>>().Value;
        var webHostTopologyOptions = provider.GetRequiredService<IOptions<WebHostTopologyOptions>>().Value;
        var localizationOptions = provider.GetRequiredService<IOptions<LocalizationOptions>>().Value;
        var jsonOptions = provider.GetRequiredService<IOptions<JsonOptions>>().Value;
        var responseCompressionOptions = provider.GetRequiredService<IOptions<ResponseCompressionOptions>>().Value;
        var outputCacheOptions = provider.GetRequiredService<IOptions<OutputCacheOptions>>().Value;

        Assert.True(demoSeedOptions.EnableApi);
        Assert.True(demoSeedOptions.EnableStartupSeed);
        Assert.Equal("DEMO", demoSeedOptions.ContractsPrefix);
        Assert.True(webHostTopologyOptions.EnableEmbeddedWorkers);
        Assert.True(webHostTopologyOptions.EnableDemoSeedWorker);
        Assert.Equal("Resources", localizationOptions.ResourcesPath);
        Assert.Contains(jsonOptions.JsonSerializerOptions.Converters, converter => converter is JsonStringEnumConverter);
        Assert.True(responseCompressionOptions.EnableForHttps);
        Assert.Contains("application/json", responseCompressionOptions.MimeTypes);
        Assert.True(responseCompressionOptions.Providers.Count >= 2);
        Assert.NotNull(outputCacheOptions);
    }

    [Fact]
    public void AddSubcontractorWebComposition_ShouldRegisterDemoService_AndSkipHostedWorkersByDefault()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([])
            .Build();

        services.AddSubcontractorWebComposition(configuration);

        Assert.Contains(
            services,
            descriptor =>
                descriptor.ServiceType == typeof(IDemoContractsSmokeSeedService) &&
                descriptor.ImplementationType == typeof(DemoContractsSmokeSeedService) &&
                descriptor.Lifetime == ServiceLifetime.Scoped);

        var hostedServiceTypes = services
            .Where(descriptor => descriptor.ServiceType == typeof(IHostedService))
            .Select(descriptor => descriptor.ImplementationType)
            .Where(type => type is not null)
            .Cast<Type>()
            .ToHashSet();

        Assert.DoesNotContain(typeof(SourceDataImportProcessingWorker), hostedServiceTypes);
        Assert.DoesNotContain(typeof(SlaMonitoringWorker), hostedServiceTypes);
        Assert.DoesNotContain(typeof(ContractorRatingWorker), hostedServiceTypes);
        Assert.DoesNotContain(typeof(DemoContractsSeedWorker), hostedServiceTypes);
    }

    [Fact]
    public void AddSubcontractorWebComposition_ShouldRegisterHostedWorkers_WhenEnabledByTopologyFlags()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WebHostTopology:EnableEmbeddedWorkers"] = "true",
                ["WebHostTopology:EnableDemoSeedWorker"] = "true"
            })
            .Build();

        services.AddSubcontractorWebComposition(configuration);

        var hostedServiceTypes = services
            .Where(descriptor => descriptor.ServiceType == typeof(IHostedService))
            .Select(descriptor => descriptor.ImplementationType)
            .Where(type => type is not null)
            .Cast<Type>()
            .ToHashSet();

        Assert.Contains(typeof(SourceDataImportProcessingWorker), hostedServiceTypes);
        Assert.Contains(typeof(SlaMonitoringWorker), hostedServiceTypes);
        Assert.Contains(typeof(ContractorRatingWorker), hostedServiceTypes);
        Assert.Contains(typeof(DemoContractsSeedWorker), hostedServiceTypes);
    }
}
