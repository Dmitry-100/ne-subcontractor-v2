using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contracts;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contracts;

public sealed class ContractsDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveContractsFacade_AndReturnEmptyList()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IContractsService>();

        var list = await service.ListAsync(null, null, null, null, null);

        Assert.NotNull(list);
        Assert.Empty(list);
        Assert.IsType<ContractsService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterContractsWorkflowDependencies()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<IContractsService>();
        var facadeAlias = scope.ServiceProvider.GetRequiredService<ContractsService>();
        var readQuery = scope.ServiceProvider.GetRequiredService<ContractReadQueryService>();
        var executionWorkflow = scope.ServiceProvider.GetRequiredService<ContractExecutionWorkflowService>();
        var lifecycleWorkflow = scope.ServiceProvider.GetRequiredService<ContractLifecycleWorkflowService>();

        Assert.NotNull(facade);
        Assert.NotNull(facadeAlias);
        Assert.NotNull(readQuery);
        Assert.NotNull(executionWorkflow);
        Assert.NotNull(lifecycleWorkflow);
        Assert.Same(facadeAlias, facade);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("contracts-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("contracts-di-user"));

        services.AddApplication();
        return services;
    }
}
