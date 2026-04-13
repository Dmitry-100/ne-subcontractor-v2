using Microsoft.Extensions.DependencyInjection;

namespace Subcontractor.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services
            .AddProjectsModule()
            .AddAnalyticsModule()
            .AddContractsModule()
            .AddContractorsModule()
            .AddContractorRatingsModule()
            .AddDashboardModule()
            .AddExportsModule()
            .AddImportsModule()
            .AddXmlInboxImportsModule()
            .AddLotsModule()
            .AddLotRecommendationsModule()
            .AddProcurementProceduresModule()
            .AddReferenceDataModule()
            .AddUsersAdministrationModule()
            .AddSlaModule();

        return services;
    }
}
