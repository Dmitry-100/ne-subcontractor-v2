using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Projects;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Projects;

public sealed class ProjectsDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveProjectsFacade_AndReturnEmptyList()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IProjectsService>();

        var list = await service.ListAsync(null, CancellationToken.None);

        Assert.NotNull(list);
        Assert.Empty(list);
        Assert.IsType<ProjectsService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<ProjectsService>();
        var contract = scope.ServiceProvider.GetRequiredService<IProjectsService>();
        var scopeResolverService = scope.ServiceProvider.GetRequiredService<ProjectScopeResolverService>();
        var readQueryService = scope.ServiceProvider.GetRequiredService<ProjectReadQueryService>();
        var writeWorkflowService = scope.ServiceProvider.GetRequiredService<ProjectWriteWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(scopeResolverService);
        Assert.NotNull(readQueryService);
        Assert.NotNull(writeWorkflowService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("projects-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("system"));

        services.AddApplication();
        return services;
    }
}
