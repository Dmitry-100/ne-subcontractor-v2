using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Domain.Users;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Configuration;

public static class AuthorizationServiceCollectionExtensions
{
    private static readonly PolicyPermissionMapping[] PolicyMappingsInternal =
    [
        new(PolicyCodes.ProjectsRead, PermissionCodes.ProjectsRead),
        new(PolicyCodes.ProjectsCreate, PermissionCodes.ProjectsCreate),
        new(PolicyCodes.ProjectsUpdate, PermissionCodes.ProjectsUpdate),
        new(PolicyCodes.ProjectsDelete, PermissionCodes.ProjectsDelete),
        new(PolicyCodes.ContractorsRead, PermissionCodes.ContractorsRead),
        new(PolicyCodes.ContractorsCreate, PermissionCodes.ContractorsCreate),
        new(PolicyCodes.ContractorsUpdate, PermissionCodes.ContractorsUpdate),
        new(PolicyCodes.ContractorsDelete, PermissionCodes.ContractorsDelete),
        new(PolicyCodes.ContractsRead, PermissionCodes.ContractsRead),
        new(PolicyCodes.ContractsCreate, PermissionCodes.ContractsCreate),
        new(PolicyCodes.ContractsUpdate, PermissionCodes.ContractsUpdate),
        new(PolicyCodes.ContractsDelete, PermissionCodes.ContractsDelete),
        new(PolicyCodes.LotsRead, PermissionCodes.LotsRead),
        new(PolicyCodes.LotsCreate, PermissionCodes.LotsCreate),
        new(PolicyCodes.LotsUpdate, PermissionCodes.LotsUpdate),
        new(PolicyCodes.LotsDelete, PermissionCodes.LotsDelete),
        new(PolicyCodes.LotsTransition, PermissionCodes.LotsTransition),
        new(PolicyCodes.ProceduresRead, PermissionCodes.ProceduresRead),
        new(PolicyCodes.ProceduresCreate, PermissionCodes.ProceduresCreate),
        new(PolicyCodes.ProceduresUpdate, PermissionCodes.ProceduresUpdate),
        new(PolicyCodes.ProceduresDelete, PermissionCodes.ProceduresDelete),
        new(PolicyCodes.ProceduresTransition, PermissionCodes.ProceduresTransition),
        new(PolicyCodes.ReferenceDataRead, PermissionCodes.ReferenceDataRead),
        new(PolicyCodes.ReferenceDataWrite, PermissionCodes.ReferenceDataWrite),
        new(PolicyCodes.UsersRead, PermissionCodes.UsersRead),
        new(PolicyCodes.UsersWrite, PermissionCodes.UsersWrite),
        new(PolicyCodes.ImportsRead, PermissionCodes.ImportsRead),
        new(PolicyCodes.ImportsWrite, PermissionCodes.ImportsWrite),
        new(PolicyCodes.SlaRead, PermissionCodes.SlaRead),
        new(PolicyCodes.SlaWrite, PermissionCodes.SlaWrite),
        new(PolicyCodes.AnalyticsRead, PermissionCodes.AnalyticsRead)
    ];

    public static IReadOnlyList<PolicyPermissionMapping> PolicyMappings => PolicyMappingsInternal;

    public static IServiceCollection AddSubcontractorAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            foreach (var mapping in PolicyMappingsInternal)
            {
                options.AddPolicy(mapping.PolicyCode, policy =>
                    policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(mapping.PermissionCode)));
            }
        });

        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
        return services;
    }
}

public readonly record struct PolicyPermissionMapping(string PolicyCode, string PermissionCode);
