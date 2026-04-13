using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Analytics;

public sealed class AnalyticsDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveAnalyticsFacade_AndReturnViewCatalog()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IAnalyticsService>();

        var catalog = await service.GetViewCatalogAsync(CancellationToken.None);

        Assert.NotNull(catalog);
        Assert.NotEmpty(catalog);
        Assert.IsType<AnalyticsService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<AnalyticsService>();
        var contract = scope.ServiceProvider.GetRequiredService<IAnalyticsService>();
        var kpiQueryService = scope.ServiceProvider.GetRequiredService<AnalyticsKpiDashboardQueryService>();
        var viewCatalogQueryService = scope.ServiceProvider.GetRequiredService<AnalyticsViewCatalogQueryService>();

        Assert.Same(facade, contract);
        Assert.NotNull(kpiQueryService);
        Assert.NotNull(viewCatalogQueryService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("analytics-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("analytics-di-user"));
        services.AddScoped<IDateTimeProvider>(_ => new FixedDateTimeProvider(new DateTimeOffset(2026, 4, 10, 12, 0, 0, TimeSpan.Zero)));

        services.AddApplication();
        return services;
    }

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FixedDateTimeProvider(DateTimeOffset utcNow)
        {
            _utcNow = utcNow;
        }

        public DateTimeOffset UtcNow => _utcNow;
    }
}
