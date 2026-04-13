using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveDashboardFacade_AndReturnEmptySummaryForUnknownUser()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IDashboardService>();

        var summary = await service.GetSummaryAsync(CancellationToken.None);

        Assert.NotNull(summary);
        Assert.Equal(0, summary.Counters.ProjectsTotal);
        Assert.Equal(0, summary.Counters.LotsTotal);
        Assert.Equal(0, summary.Counters.ProceduresTotal);
        Assert.Equal(0, summary.Counters.ContractsTotal);
        Assert.IsType<DashboardService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<DashboardService>();
        var contract = scope.ServiceProvider.GetRequiredService<IDashboardService>();
        var importPipelineQueryService = scope.ServiceProvider.GetRequiredService<DashboardImportPipelineQueryService>();
        var myTasksQueryService = scope.ServiceProvider.GetRequiredService<DashboardMyTasksQueryService>();
        var performanceMetricsQueryService = scope.ServiceProvider.GetRequiredService<DashboardPerformanceMetricsQueryService>();
        var userContextResolverService = scope.ServiceProvider.GetRequiredService<DashboardUserContextResolverService>();
        var countersAndStatusesQueryService = scope.ServiceProvider.GetRequiredService<DashboardCountersAndStatusesQueryService>();

        Assert.Same(facade, contract);
        Assert.NotNull(importPipelineQueryService);
        Assert.NotNull(myTasksQueryService);
        Assert.NotNull(performanceMetricsQueryService);
        Assert.NotNull(userContextResolverService);
        Assert.NotNull(countersAndStatusesQueryService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("dashboard-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("unknown.user"));
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
