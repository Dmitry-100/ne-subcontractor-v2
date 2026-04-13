using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveReferenceDataFacade_AndReturnEmptyList()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IReferenceDataService>();

        var items = await service.ListAsync("SLA_REASON", activeOnly: false, CancellationToken.None);

        Assert.NotNull(items);
        Assert.Empty(items);
        Assert.IsType<ReferenceDataService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<ReferenceDataService>();
        var contract = scope.ServiceProvider.GetRequiredService<IReferenceDataService>();
        var readQuery = scope.ServiceProvider.GetRequiredService<ReferenceDataReadQueryService>();
        var writeWorkflow = scope.ServiceProvider.GetRequiredService<ReferenceDataWriteWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(readQuery);
        Assert.NotNull(writeWorkflow);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("reference-data-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("reference-data-di-user"));
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
