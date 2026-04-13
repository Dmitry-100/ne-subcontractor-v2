using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.UsersAdministration;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Admin;

public sealed class UsersAdministrationDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveUsersAdministrationFacade_AndReturnEmptyList()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IUsersAdministrationService>();

        var users = await service.ListAsync(null, CancellationToken.None);

        Assert.NotNull(users);
        Assert.Empty(users);
        Assert.IsType<UsersAdministrationService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<UsersAdministrationService>();
        var contract = scope.ServiceProvider.GetRequiredService<IUsersAdministrationService>();
        var readQuery = scope.ServiceProvider.GetRequiredService<UsersAdministrationReadQueryService>();
        var writeWorkflow = scope.ServiceProvider.GetRequiredService<UsersAdministrationWriteWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(readQuery);
        Assert.NotNull(writeWorkflow);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("users-admin-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("users-admin-di-user"));
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
