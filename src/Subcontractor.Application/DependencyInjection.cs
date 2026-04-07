using Microsoft.Extensions.DependencyInjection;
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

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IProjectsService, ProjectsService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IContractsService, ContractsService>();
        services.AddScoped<IContractorsService, ContractorsService>();
        services.AddScoped<IContractorRatingsService, ContractorRatingsService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IRegistryExportService, RegistryExportService>();
        services.AddScoped<ISourceDataImportsService, SourceDataImportsService>();
        services.AddScoped<IXmlSourceDataImportInboxService, XmlSourceDataImportInboxService>();
        services.AddScoped<ILotsService, LotsService>();
        services.AddScoped<ILotRecommendationsService, LotRecommendationsService>();
        services.AddScoped<IProcurementProceduresService, ProcurementProceduresService>();
        services.AddScoped<IReferenceDataService, ReferenceDataService>();
        services.AddScoped<IUsersAdministrationService, UsersAdministrationService>();
        services.AddScoped<ISlaMonitoringService, SlaMonitoringService>();

        return services;
    }
}
