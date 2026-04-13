using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorRatingsDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveContractorRatingsFacade_AndReturnEmptyAnalytics()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IContractorRatingsService>();

        var analytics = await service.GetAnalyticsAsync(CancellationToken.None);

        Assert.NotNull(analytics);
        Assert.Empty(analytics);
        Assert.IsType<ContractorRatingsService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<ContractorRatingsService>();
        var contract = scope.ServiceProvider.GetRequiredService<IContractorRatingsService>();
        var readQueryService = scope.ServiceProvider.GetRequiredService<ContractorRatingReadQueryService>();
        var recalculationWorkflowService = scope.ServiceProvider.GetRequiredService<ContractorRatingRecalculationWorkflowService>();
        var modelLifecycleService = scope.ServiceProvider.GetRequiredService<ContractorRatingModelLifecycleService>();
        var writeWorkflowService = scope.ServiceProvider.GetRequiredService<ContractorRatingWriteWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(readQueryService);
        Assert.NotNull(recalculationWorkflowService);
        Assert.NotNull(modelLifecycleService);
        Assert.NotNull(writeWorkflowService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("contractor-ratings-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("contractor-ratings-di-user"));
        services.AddScoped<IDateTimeProvider>(_ => new TestDateTimeProvider(new DateTimeOffset(2026, 4, 10, 12, 0, 0, TimeSpan.Zero)));

        services.AddApplication();
        return services;
    }

    private sealed class TestDateTimeProvider : IDateTimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public TestDateTimeProvider(DateTimeOffset utcNow)
        {
            _utcNow = utcNow;
        }

        public DateTimeOffset UtcNow => _utcNow;
    }
}
