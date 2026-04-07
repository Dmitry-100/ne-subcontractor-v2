using Microsoft.EntityFrameworkCore;
using Subcontractor.Domain.Users;

namespace Subcontractor.Infrastructure.Persistence.SeedData;

public static class DefaultRolesAndPermissionsSeeder
{
    public static async Task SeedAsync(AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        var roleDefinitions = new Dictionary<string, string>
        {
            [RoleNames.Gip] = "Chief project engineer",
            [RoleNames.Commercial] = "Commercial block",
            [RoleNames.TenderCommission] = "Tender commission",
            [RoleNames.Planner] = "Planner",
            [RoleNames.Administrator] = "System administrator"
        };

        var rolePermissions = new Dictionary<string, string[]>
        {
            [RoleNames.Gip] =
            [
                PermissionCodes.ProjectsRead, // Scoped read: only own projects (see ProjectsService data-scope).
                PermissionCodes.ContractorsRead,
                PermissionCodes.ContractsRead,
                PermissionCodes.LotsRead,
                PermissionCodes.ProceduresRead,
                PermissionCodes.ProceduresCreate,
                PermissionCodes.ProceduresUpdate,
                PermissionCodes.ProceduresTransition,
                PermissionCodes.ReferenceDataRead,
                PermissionCodes.ImportsRead,
                PermissionCodes.SlaRead,
                PermissionCodes.AnalyticsRead
            ],
            [RoleNames.Commercial] =
            [
                PermissionCodes.ProjectsRead,
                PermissionCodes.ProjectsReadAll,
                PermissionCodes.ProjectsCreate,
                PermissionCodes.ProjectsUpdate,
                PermissionCodes.ContractorsRead,
                PermissionCodes.ContractorsCreate,
                PermissionCodes.ContractorsUpdate,
                PermissionCodes.ContractsRead,
                PermissionCodes.ContractsCreate,
                PermissionCodes.ContractsUpdate,
                PermissionCodes.LotsRead,
                PermissionCodes.LotsCreate,
                PermissionCodes.LotsUpdate,
                PermissionCodes.LotsTransition,
                PermissionCodes.ProceduresRead,
                PermissionCodes.ProceduresCreate,
                PermissionCodes.ProceduresUpdate,
                PermissionCodes.ProceduresTransition,
                PermissionCodes.ReferenceDataRead,
                PermissionCodes.ImportsRead,
                PermissionCodes.ImportsWrite,
                PermissionCodes.SlaRead,
                PermissionCodes.SlaWrite,
                PermissionCodes.AnalyticsRead
            ],
            [RoleNames.TenderCommission] =
            [
                PermissionCodes.ProjectsRead,
                PermissionCodes.ProjectsReadAll,
                PermissionCodes.ContractorsRead,
                PermissionCodes.ContractsRead,
                PermissionCodes.LotsRead,
                PermissionCodes.ProceduresRead,
                PermissionCodes.ReferenceDataRead,
                PermissionCodes.ImportsRead,
                PermissionCodes.SlaRead,
                PermissionCodes.AnalyticsRead
            ],
            [RoleNames.Planner] =
            [
                PermissionCodes.ProjectsRead,
                PermissionCodes.ProjectsReadAll,
                PermissionCodes.ContractorsRead,
                PermissionCodes.ContractsRead,
                PermissionCodes.LotsRead,
                PermissionCodes.ProceduresRead,
                PermissionCodes.ReferenceDataRead,
                PermissionCodes.ImportsRead,
                PermissionCodes.ImportsWrite,
                PermissionCodes.SlaRead,
                PermissionCodes.AnalyticsRead
            ],
            [RoleNames.Administrator] =
            [
                PermissionCodes.ProjectsRead,
                PermissionCodes.ProjectsReadAll,
                PermissionCodes.ProjectsCreate,
                PermissionCodes.ProjectsUpdate,
                PermissionCodes.ProjectsDelete,
                PermissionCodes.ContractorsRead,
                PermissionCodes.ContractorsCreate,
                PermissionCodes.ContractorsUpdate,
                PermissionCodes.ContractorsDelete,
                PermissionCodes.ContractsRead,
                PermissionCodes.ContractsCreate,
                PermissionCodes.ContractsUpdate,
                PermissionCodes.ContractsDelete,
                PermissionCodes.LotsRead,
                PermissionCodes.LotsCreate,
                PermissionCodes.LotsUpdate,
                PermissionCodes.LotsDelete,
                PermissionCodes.LotsTransition,
                PermissionCodes.ProceduresRead,
                PermissionCodes.ProceduresCreate,
                PermissionCodes.ProceduresUpdate,
                PermissionCodes.ProceduresDelete,
                PermissionCodes.ProceduresTransition,
                PermissionCodes.ReferenceDataRead,
                PermissionCodes.ReferenceDataWrite,
                PermissionCodes.UsersRead,
                PermissionCodes.UsersWrite,
                PermissionCodes.ImportsRead,
                PermissionCodes.ImportsWrite,
                PermissionCodes.SlaRead,
                PermissionCodes.SlaWrite,
                PermissionCodes.AnalyticsRead
            ]
        };

        var existingRoles = await dbContext.RolesSet
            .Where(x => roleDefinitions.Keys.Contains(x.Name))
            .ToListAsync(cancellationToken);

        foreach (var roleDefinition in roleDefinitions)
        {
            if (existingRoles.Any(x => x.Name == roleDefinition.Key))
            {
                continue;
            }

            dbContext.RolesSet.Add(new AppRole
            {
                Name = roleDefinition.Key,
                Description = roleDefinition.Value
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        existingRoles = await dbContext.RolesSet
            .Where(x => roleDefinitions.Keys.Contains(x.Name))
            .ToListAsync(cancellationToken);

        foreach (var role in existingRoles)
        {
            if (!rolePermissions.TryGetValue(role.Name, out var expectedPermissions))
            {
                continue;
            }

            var expectedSet = expectedPermissions.ToHashSet();
            var current = await dbContext.RolePermissionsSet
                .Where(x => x.AppRoleId == role.Id)
                .ToListAsync(cancellationToken);

            var toDelete = current.Where(x => !expectedSet.Contains(x.PermissionCode)).ToArray();
            if (toDelete.Length > 0)
            {
                dbContext.RolePermissionsSet.RemoveRange(toDelete);
            }

            var currentSet = current.Select(x => x.PermissionCode).ToHashSet();
            var toAdd = expectedSet.Where(x => !currentSet.Contains(x));
            foreach (var permissionCode in toAdd)
            {
                dbContext.RolePermissionsSet.Add(new RolePermission
                {
                    AppRoleId = role.Id,
                    PermissionCode = permissionCode
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
