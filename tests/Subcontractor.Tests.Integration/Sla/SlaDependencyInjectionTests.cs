using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Sla;

public sealed class SlaDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveSlaFacade_AndReturnEmptyViolations()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ISlaMonitoringService>();

        var list = await service.ListViolationsAsync(false, CancellationToken.None);

        Assert.NotNull(list);
        Assert.Empty(list);
        Assert.IsType<SlaMonitoringService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterSlaWorkflowDependencies()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<ISlaMonitoringService>();
        var facadeAlias = scope.ServiceProvider.GetRequiredService<SlaMonitoringService>();
        var administrationService = scope.ServiceProvider.GetRequiredService<SlaRuleAndViolationAdministrationService>();
        var cycleWorkflowService = scope.ServiceProvider.GetRequiredService<SlaMonitoringCycleWorkflowService>();
        var queryService = scope.ServiceProvider.GetRequiredService<SlaViolationCandidateQueryService>();

        Assert.NotNull(facade);
        Assert.NotNull(facadeAlias);
        Assert.NotNull(administrationService);
        Assert.NotNull(cycleWorkflowService);
        Assert.NotNull(queryService);
        Assert.Same(facadeAlias, facade);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("sla-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("sla-di-user"));
        services.AddScoped<IDateTimeProvider>(_ => new TestDateTimeProvider(new DateTimeOffset(2026, 4, 10, 12, 0, 0, TimeSpan.Zero)));
        services.AddScoped<INotificationEmailSender>(_ => new FakeNotificationEmailSender());
        services.Configure<SlaMonitoringOptions>(options => options.DefaultWarningDaysBeforeDue = 3);

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
