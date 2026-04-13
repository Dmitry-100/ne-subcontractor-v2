using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcurementProceduresDependencyInjectionTests
{
    [Fact]
    public async Task AddApplication_ShouldResolveProcurementServiceFacade_AndReturnEmptyList()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IProcurementProceduresService>();

        var list = await service.ListAsync(null, null, null);

        Assert.NotNull(list);
        Assert.Empty(list);
        Assert.IsType<ProcurementProceduresService>(service);
    }

    [Fact]
    public void AddApplication_ShouldRegisterInterfaceAlias_ToSameScopedFacadeInstance()
    {
        var services = BuildServiceCollection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var facade = scope.ServiceProvider.GetRequiredService<ProcurementProceduresService>();
        var contract = scope.ServiceProvider.GetRequiredService<IProcurementProceduresService>();
        var lifecycleService = scope.ServiceProvider.GetRequiredService<ProcedureLifecycleService>();
        var statusMutationService = scope.ServiceProvider.GetRequiredService<ProcedureStatusMutationService>();
        var transitionWorkflowService = scope.ServiceProvider.GetRequiredService<ProcedureTransitionWorkflowService>();
        var shortlistWorkflowService = scope.ServiceProvider.GetRequiredService<ProcedureShortlistWorkflowService>();
        var shortlistOrchestrationService = scope.ServiceProvider.GetRequiredService<ProcedureShortlistOrchestrationService>();
        var approvalWorkflowService = scope.ServiceProvider.GetRequiredService<ProcedureApprovalWorkflowService>();
        var externalApprovalWorkflowService = scope.ServiceProvider.GetRequiredService<ProcedureExternalApprovalWorkflowService>();
        var offersWorkflowService = scope.ServiceProvider.GetRequiredService<ProcedureOffersWorkflowService>();
        var outcomeWorkflowService = scope.ServiceProvider.GetRequiredService<ProcedureOutcomeWorkflowService>();
        var attachmentBindingService = scope.ServiceProvider.GetRequiredService<ProcedureAttachmentBindingService>();
        var lotWorkflowService = scope.ServiceProvider.GetRequiredService<ProcedureLotWorkflowService>();

        Assert.Same(facade, contract);
        Assert.NotNull(lifecycleService);
        Assert.NotNull(statusMutationService);
        Assert.NotNull(transitionWorkflowService);
        Assert.NotNull(shortlistWorkflowService);
        Assert.NotNull(shortlistOrchestrationService);
        Assert.NotNull(approvalWorkflowService);
        Assert.NotNull(externalApprovalWorkflowService);
        Assert.NotNull(offersWorkflowService);
        Assert.NotNull(outcomeWorkflowService);
        Assert.NotNull(attachmentBindingService);
        Assert.NotNull(lotWorkflowService);
    }

    private static IServiceCollection BuildServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddScoped<AppDbContext>(_ => TestDbContextFactory.Create("proc-di-user"));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUserService>(_ => new TestCurrentUserService("proc-di-user"));

        services.AddApplication();
        return services;
    }
}
