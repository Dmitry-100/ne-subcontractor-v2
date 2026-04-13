using System.IO.Compression;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Subcontractor.Web.Services;
using Subcontractor.Web.Workers;

namespace Subcontractor.Web.Configuration;

public static class WebServiceCollectionExtensions
{
    public const string HealthCheckOutputCachePolicyName = "HealthCheck";
    public const string ReferenceDataReadOutputCachePolicyName = "ReferenceDataRead";
    public const string ReferenceDataOutputCacheTag = "reference-data";
    public const string AdminRolesReadOutputCachePolicyName = "AdminRolesRead";
    public const string AnalyticsKpiReadOutputCachePolicyName = "AnalyticsKpiRead";
    public const string AnalyticsViewsReadOutputCachePolicyName = "AnalyticsViewsRead";

    public static IServiceCollection AddSubcontractorWebComposition(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<DemoSeedOptions>(configuration.GetSection(DemoSeedOptions.SectionName));
        services.Configure<WebHostTopologyOptions>(configuration.GetSection(WebHostTopologyOptions.SectionName));
        var hostTopologyOptions = configuration.GetSection(WebHostTopologyOptions.SectionName).Get<WebHostTopologyOptions>() ?? new();
        services.AddLocalization(options =>
        {
            options.ResourcesPath = "Resources";
        });

        services.AddScoped<IDemoContractsSmokeSeedService, DemoContractsSmokeSeedService>();
        services
            .AddControllersWithViews()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/json"]);
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
        });
        services.Configure<BrotliCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Fastest;
        });
        services.Configure<GzipCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Fastest;
        });
        services.AddOutputCache(options =>
        {
            options.AddPolicy(HealthCheckOutputCachePolicyName, builder => builder.Expire(TimeSpan.FromSeconds(15)));
            options.AddPolicy(
                ReferenceDataReadOutputCachePolicyName,
                builder => builder
                    .Expire(TimeSpan.FromSeconds(30))
                    .SetVaryByRouteValue("typeCode")
                    .SetVaryByQuery("activeOnly")
                    .Tag(ReferenceDataOutputCacheTag));
            options.AddPolicy(
                AdminRolesReadOutputCachePolicyName,
                builder => builder.Expire(TimeSpan.FromSeconds(30)));
            options.AddPolicy(
                AnalyticsKpiReadOutputCachePolicyName,
                builder => builder.Expire(TimeSpan.FromSeconds(30)));
            options.AddPolicy(
                AnalyticsViewsReadOutputCachePolicyName,
                builder => builder.Expire(TimeSpan.FromSeconds(60)));
        });

        if (hostTopologyOptions.EnableEmbeddedWorkers)
        {
            services.AddHostedService<SourceDataImportProcessingWorker>();
            services.AddHostedService<SlaMonitoringWorker>();
            services.AddHostedService<ContractorRatingWorker>();
        }

        if (hostTopologyOptions.EnableDemoSeedWorker)
        {
            services.AddHostedService<DemoContractsSeedWorker>();
        }

        return services;
    }
}
