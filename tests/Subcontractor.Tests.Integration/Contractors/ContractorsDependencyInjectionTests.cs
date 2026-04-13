using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorsDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveContractorsFacade_AndReturnEmptyList()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IContractorsService>();

        var list = await service.ListAsync(null, CancellationToken.None);

        Assert.NotNull(list);
        Assert.Empty(list);
        Assert.IsType<ContractorsService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<ContractorsService>();
        var contract = scope.ServiceProvider.GetRequiredService<IContractorsService>();
        var readQueryService = scope.ServiceProvider.GetRequiredService<ContractorReadQueryService>();
        var writeWorkflowService = scope.ServiceProvider.GetRequiredService<ContractorWriteWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(readQueryService);
        Assert.NotNull(writeWorkflowService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("contractors-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("contractors-di-user"));

        services.AddApplication();
        return services;
    }
}
