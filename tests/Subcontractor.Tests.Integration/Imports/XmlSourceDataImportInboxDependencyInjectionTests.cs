using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Imports;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class XmlSourceDataImportInboxDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveXmlInboxFacade_AndReturnEmptyList()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IXmlSourceDataImportInboxService>();

        var list = await service.ListAsync(CancellationToken.None);

        Assert.NotNull(list);
        Assert.Empty(list);
        Assert.IsType<XmlSourceDataImportInboxService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<XmlSourceDataImportInboxService>();
        var contract = scope.ServiceProvider.GetRequiredService<IXmlSourceDataImportInboxService>();
        var readQueryService = scope.ServiceProvider.GetRequiredService<XmlSourceDataImportInboxReadQueryService>();
        var writeWorkflowService = scope.ServiceProvider.GetRequiredService<XmlSourceDataImportInboxWriteWorkflowService>();
        var processingWorkflowService = scope.ServiceProvider.GetRequiredService<XmlSourceDataImportInboxProcessingWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(readQueryService);
        Assert.NotNull(writeWorkflowService);
        Assert.NotNull(processingWorkflowService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("xml-inbox-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("xml-inbox-di-user"));
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
