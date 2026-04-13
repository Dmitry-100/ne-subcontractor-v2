using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Exports;
using Subcontractor.Application.Lots;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.Projects;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Exports;

public sealed class RegistryExportDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveRegistryExportFacade_AndReturnCsv()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IRegistryExportService>();

        var file = await service.ExportProjectsAsync(null, CancellationToken.None);

        Assert.NotNull(file);
        Assert.EndsWith(".csv", file.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("text/csv; charset=utf-8", file.ContentType);
        Assert.NotNull(file.Content);
        Assert.NotEmpty(file.Content);
        Assert.IsType<RegistryExportService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<RegistryExportService>();
        var contract = scope.ServiceProvider.GetRequiredService<IRegistryExportService>();
        var projects = scope.ServiceProvider.GetRequiredService<IProjectsService>();
        var contractors = scope.ServiceProvider.GetRequiredService<IContractorsService>();
        var lots = scope.ServiceProvider.GetRequiredService<ILotsService>();
        var procedures = scope.ServiceProvider.GetRequiredService<IProcurementProceduresService>();
        var contracts = scope.ServiceProvider.GetRequiredService<IContractsService>();

        Assert.Same(facade, contract);
        Assert.NotNull(projects);
        Assert.NotNull(contractors);
        Assert.NotNull(lots);
        Assert.NotNull(procedures);
        Assert.NotNull(contracts);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("registry-export-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("registry-export-di-user"));
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
