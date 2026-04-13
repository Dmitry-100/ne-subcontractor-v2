using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Lots;

public sealed class LotRecommendationsDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveLotRecommendationsFacade_AndReturnNullForUnknownBatch()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ILotRecommendationsService>();

        var result = await service.BuildFromImportBatchAsync(Guid.NewGuid(), CancellationToken.None);

        Assert.Null(result);
        Assert.IsType<LotRecommendationsService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<LotRecommendationsService>();
        var contract = scope.ServiceProvider.GetRequiredService<ILotRecommendationsService>();
        var groupingService = scope.ServiceProvider.GetRequiredService<LotRecommendationGroupingService>();
        var applyWorkflowService = scope.ServiceProvider.GetRequiredService<LotRecommendationApplyWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(groupingService);
        Assert.NotNull(applyWorkflowService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("lot-recommendations-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("lot-recommendations-di-user"));
        services.AddScoped<IDateTimeProvider>(_ => new TestDateTimeProvider(new DateTimeOffset(2026, 4, 10, 12, 0, 0, TimeSpan.Zero)));
        services.AddScoped<INotificationEmailSender>(_ => new FakeNotificationEmailSender());
        services.Configure<Subcontractor.Application.Sla.SlaMonitoringOptions>(options => options.DefaultWarningDaysBeforeDue = 3);

        services.AddApplication();
        return services;
    }

    private sealed class FakeNotificationEmailSender : INotificationEmailSender
    {
        public Task<NotificationEmailSendResult> SendAsync(
            NotificationEmailMessage message,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new NotificationEmailSendResult(true, null));
        }
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
