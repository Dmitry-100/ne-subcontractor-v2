using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Dashboard;
using Subcontractor.Application.Exports;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Lots;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.Projects;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.Sla;
using Subcontractor.Application.UsersAdministration;

namespace Subcontractor.Application;

internal static class ApplicationModuleServiceCollectionExtensions
{
    public static IServiceCollection AddProjectsModule(this IServiceCollection services)
    {
        services.AddScoped<ProjectScopeResolverService>();
        services.AddScoped<ProjectReadQueryService>();
        services.AddScoped<ProjectWriteWorkflowService>();
        services.AddScoped<ProjectsService>(sp =>
            new ProjectsService(
                sp.GetRequiredService<ProjectReadQueryService>(),
                sp.GetRequiredService<ProjectWriteWorkflowService>()));
        services.AddScoped<IProjectsService>(sp => sp.GetRequiredService<ProjectsService>());
        return services;
    }

    public static IServiceCollection AddAnalyticsModule(this IServiceCollection services)
    {
        services.AddScoped<AnalyticsKpiDashboardQueryService>();
        services.AddScoped<AnalyticsViewCatalogQueryService>();
        services.AddScoped<AnalyticsService>(sp =>
            new AnalyticsService(
                sp.GetRequiredService<AnalyticsKpiDashboardQueryService>(),
                sp.GetRequiredService<AnalyticsViewCatalogQueryService>()));
        services.AddScoped<IAnalyticsService>(sp => sp.GetRequiredService<AnalyticsService>());
        return services;
    }

    public static IServiceCollection AddContractsModule(this IServiceCollection services)
    {
        services.AddScoped<ContractReadQueryService>();
        services.AddScoped<ContractExecutionWorkflowService>();
        services.AddScoped<ContractLifecycleWorkflowService>();
        services.AddScoped<ContractsService>(sp =>
            new ContractsService(
                sp.GetRequiredService<ContractReadQueryService>(),
                sp.GetRequiredService<ContractExecutionWorkflowService>(),
                sp.GetRequiredService<ContractLifecycleWorkflowService>()));
        services.AddScoped<IContractsService>(sp => sp.GetRequiredService<ContractsService>());
        return services;
    }

    public static IServiceCollection AddContractorsModule(this IServiceCollection services)
    {
        services.AddScoped<ContractorReadQueryService>();
        services.AddScoped<ContractorWriteWorkflowService>();
        services.AddScoped<ContractorsService>(sp =>
            new ContractorsService(
                sp.GetRequiredService<ContractorReadQueryService>(),
                sp.GetRequiredService<ContractorWriteWorkflowService>()));
        services.AddScoped<IContractorsService>(sp => sp.GetRequiredService<ContractorsService>());
        return services;
    }

    public static IServiceCollection AddContractorRatingsModule(this IServiceCollection services)
    {
        services.AddScoped<ContractorRatingReadQueryService>();
        services.AddScoped<ContractorRatingRecalculationWorkflowService>();
        services.AddScoped<ContractorRatingModelLifecycleService>();
        services.AddScoped<ContractorRatingWriteWorkflowService>();
        services.AddScoped<ContractorRatingsService>(sp =>
            new ContractorRatingsService(
                sp.GetRequiredService<ContractorRatingReadQueryService>(),
                sp.GetRequiredService<ContractorRatingModelLifecycleService>(),
                sp.GetRequiredService<ContractorRatingWriteWorkflowService>()));
        services.AddScoped<IContractorRatingsService>(sp => sp.GetRequiredService<ContractorRatingsService>());
        return services;
    }

    public static IServiceCollection AddDashboardModule(this IServiceCollection services)
    {
        services.AddScoped<DashboardImportPipelineQueryService>();
        services.AddScoped<DashboardMyTasksQueryService>();
        services.AddScoped<DashboardPerformanceMetricsQueryService>();
        services.AddScoped<DashboardUserContextResolverService>();
        services.AddScoped<DashboardCountersAndStatusesQueryService>();
        services.AddScoped<DashboardService>(sp =>
            new DashboardService(
                sp.GetRequiredService<IApplicationDbContext>(),
                sp.GetRequiredService<ICurrentUserService>(),
                sp.GetRequiredService<IDateTimeProvider>(),
                sp.GetRequiredService<DashboardImportPipelineQueryService>(),
                sp.GetRequiredService<DashboardMyTasksQueryService>(),
                sp.GetRequiredService<DashboardPerformanceMetricsQueryService>(),
                sp.GetRequiredService<DashboardUserContextResolverService>(),
                sp.GetRequiredService<DashboardCountersAndStatusesQueryService>()));
        services.AddScoped<IDashboardService>(sp => sp.GetRequiredService<DashboardService>());
        return services;
    }

    public static IServiceCollection AddExportsModule(this IServiceCollection services)
    {
        services.AddScoped<RegistryExportService>(sp =>
            new RegistryExportService(
                sp.GetRequiredService<IProjectsService>(),
                sp.GetRequiredService<IContractorsService>(),
                sp.GetRequiredService<ILotsService>(),
                sp.GetRequiredService<IProcurementProceduresService>(),
                sp.GetRequiredService<IContractsService>()));
        services.AddScoped<IRegistryExportService>(sp => sp.GetRequiredService<RegistryExportService>());
        return services;
    }

    public static IServiceCollection AddImportsModule(this IServiceCollection services)
    {
        services.AddScoped<SourceDataImportReadQueryService>();
        services.AddScoped<SourceDataImportBatchProcessingWorkflowService>();
        services.AddScoped<SourceDataImportWriteWorkflowService>();
        services.AddScoped<SourceDataImportsService>(sp =>
            new SourceDataImportsService(
                sp.GetRequiredService<SourceDataImportReadQueryService>(),
                sp.GetRequiredService<SourceDataImportBatchProcessingWorkflowService>(),
                sp.GetRequiredService<SourceDataImportWriteWorkflowService>()));
        services.AddScoped<ISourceDataImportsService>(sp => sp.GetRequiredService<SourceDataImportsService>());
        return services;
    }

    public static IServiceCollection AddXmlInboxImportsModule(this IServiceCollection services)
    {
        services.AddScoped<XmlSourceDataImportInboxReadQueryService>();
        services.AddScoped<XmlSourceDataImportInboxWriteWorkflowService>();
        services.AddScoped<XmlSourceDataImportInboxProcessingWorkflowService>();
        services.AddScoped<XmlSourceDataImportInboxService>(sp =>
            new XmlSourceDataImportInboxService(
                sp.GetRequiredService<XmlSourceDataImportInboxReadQueryService>(),
                sp.GetRequiredService<XmlSourceDataImportInboxWriteWorkflowService>(),
                sp.GetRequiredService<XmlSourceDataImportInboxProcessingWorkflowService>()));
        services.AddScoped<IXmlSourceDataImportInboxService>(sp => sp.GetRequiredService<XmlSourceDataImportInboxService>());
        return services;
    }

    public static IServiceCollection AddLotsModule(this IServiceCollection services)
    {
        services.AddScoped<LotReadQueryService>();
        services.AddScoped<LotWriteWorkflowService>();
        services.AddScoped<LotsService>(sp =>
            new LotsService(
                sp.GetRequiredService<LotReadQueryService>(),
                sp.GetRequiredService<LotWriteWorkflowService>()));
        services.AddScoped<ILotsService>(sp => sp.GetRequiredService<LotsService>());
        return services;
    }

    public static IServiceCollection AddLotRecommendationsModule(this IServiceCollection services)
    {
        services.AddScoped<LotRecommendationGroupingService>();
        services.AddScoped<LotRecommendationApplyWorkflowService>();
        services.AddScoped<LotRecommendationsService>(sp =>
            new LotRecommendationsService(
                sp.GetRequiredService<IApplicationDbContext>(),
                sp.GetRequiredService<LotRecommendationGroupingService>(),
                sp.GetRequiredService<LotRecommendationApplyWorkflowService>()));
        services.AddScoped<ILotRecommendationsService>(sp => sp.GetRequiredService<LotRecommendationsService>());
        return services;
    }

    public static IServiceCollection AddProcurementProceduresModule(this IServiceCollection services)
    {
        services.AddScoped<ProcedureAttachmentBindingService>();
        services.AddScoped<ProcedureStatusMutationService>();
        services.AddScoped<ProcedureLifecycleService>();
        services.AddScoped<ProcedureShortlistWorkflowService>();
        services.AddScoped<ProcedureShortlistOrchestrationService>();
        services.AddScoped<ProcedureApprovalWorkflowService>();
        services.AddScoped<ProcedureExternalApprovalWorkflowService>();
        services.AddScoped<ProcedureOffersWorkflowService>();
        services.AddScoped<ProcedureOutcomeWorkflowService>();
        services.AddScoped<ProcedureLotWorkflowService>();
        services.AddScoped<ProcedureTransitionWorkflowService>();
        services.AddScoped<ProcurementProceduresService>(sp =>
            new ProcurementProceduresService(
                sp.GetRequiredService<ProcedureLifecycleService>(),
                sp.GetRequiredService<ProcedureStatusMutationService>(),
                sp.GetRequiredService<ProcedureTransitionWorkflowService>(),
                sp.GetRequiredService<ProcedureShortlistWorkflowService>(),
                sp.GetRequiredService<ProcedureShortlistOrchestrationService>(),
                sp.GetRequiredService<ProcedureApprovalWorkflowService>(),
                sp.GetRequiredService<ProcedureExternalApprovalWorkflowService>(),
                sp.GetRequiredService<ProcedureOffersWorkflowService>(),
                sp.GetRequiredService<ProcedureOutcomeWorkflowService>(),
                sp.GetRequiredService<ProcedureAttachmentBindingService>(),
                sp.GetRequiredService<ProcedureLotWorkflowService>()));
        services.AddScoped<IProcurementProceduresService>(sp => sp.GetRequiredService<ProcurementProceduresService>());
        return services;
    }

    public static IServiceCollection AddReferenceDataModule(this IServiceCollection services)
    {
        services.AddScoped<ReferenceDataReadQueryService>();
        services.AddScoped<ReferenceDataWriteWorkflowService>();
        services.AddScoped<ReferenceDataService>(sp =>
            new ReferenceDataService(
                sp.GetRequiredService<ReferenceDataReadQueryService>(),
                sp.GetRequiredService<ReferenceDataWriteWorkflowService>()));
        services.AddScoped<IReferenceDataService>(sp => sp.GetRequiredService<ReferenceDataService>());
        return services;
    }

    public static IServiceCollection AddUsersAdministrationModule(this IServiceCollection services)
    {
        services.AddScoped<UsersAdministrationReadQueryService>();
        services.AddScoped<UsersAdministrationWriteWorkflowService>();
        services.AddScoped<UsersAdministrationService>(sp =>
            new UsersAdministrationService(
                sp.GetRequiredService<UsersAdministrationReadQueryService>(),
                sp.GetRequiredService<UsersAdministrationWriteWorkflowService>()));
        services.AddScoped<IUsersAdministrationService>(sp => sp.GetRequiredService<UsersAdministrationService>());
        return services;
    }

    public static IServiceCollection AddSlaModule(this IServiceCollection services)
    {
        services.AddScoped<SlaRuleAndViolationAdministrationService>();
        services.AddScoped<SlaViolationCandidateQueryService>();
        services.AddScoped<SlaMonitoringCycleWorkflowService>();
        services.AddScoped<SlaMonitoringService>(sp =>
            new SlaMonitoringService(
                sp.GetRequiredService<SlaRuleAndViolationAdministrationService>(),
                sp.GetRequiredService<SlaMonitoringCycleWorkflowService>(),
                sp.GetRequiredService<IOptions<SlaMonitoringOptions>>()));
        services.AddScoped<ISlaMonitoringService>(sp => sp.GetRequiredService<SlaMonitoringService>());
        return services;
    }
}
