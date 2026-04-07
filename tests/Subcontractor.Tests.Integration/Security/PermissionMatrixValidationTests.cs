using Subcontractor.Domain.Users;
using Subcontractor.Infrastructure.Persistence.SeedData;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Security;

public sealed class PermissionMatrixValidationTests
{
    [Fact]
    public async Task SeededRoles_ShouldContainExpectedPermissions()
    {
        await using var db = TestDbContextFactory.Create();
        await DefaultRolesAndPermissionsSeeder.SeedAsync(db);

        var roles = db.RolesSet
            .Select(role => new
            {
                role.Name,
                PermissionCodes = role.Permissions.Select(permission => permission.PermissionCode).ToArray()
            })
            .ToDictionary(
                role => role.Name,
                role => role.PermissionCodes.ToHashSet(StringComparer.OrdinalIgnoreCase),
                StringComparer.OrdinalIgnoreCase);

        Assert.Contains(RoleNames.Gip, roles.Keys);
        Assert.Contains(RoleNames.Commercial, roles.Keys);
        Assert.Contains(RoleNames.TenderCommission, roles.Keys);
        Assert.Contains(RoleNames.Planner, roles.Keys);
        Assert.Contains(RoleNames.Administrator, roles.Keys);

        Assert.Contains(PermissionCodes.ProjectsRead, roles[RoleNames.Gip]);
        Assert.DoesNotContain(PermissionCodes.ProjectsReadAll, roles[RoleNames.Gip]);
        Assert.Contains(PermissionCodes.ProceduresTransition, roles[RoleNames.Gip]);
        Assert.Contains(PermissionCodes.SlaRead, roles[RoleNames.Gip]);
        Assert.Contains(PermissionCodes.AnalyticsRead, roles[RoleNames.Gip]);
        Assert.DoesNotContain(PermissionCodes.SlaWrite, roles[RoleNames.Gip]);

        Assert.Contains(PermissionCodes.ProjectsReadAll, roles[RoleNames.Commercial]);
        Assert.Contains(PermissionCodes.ContractsUpdate, roles[RoleNames.Commercial]);
        Assert.Contains(PermissionCodes.LotsTransition, roles[RoleNames.Commercial]);
        Assert.Contains(PermissionCodes.ImportsWrite, roles[RoleNames.Commercial]);
        Assert.Contains(PermissionCodes.SlaWrite, roles[RoleNames.Commercial]);
        Assert.Contains(PermissionCodes.AnalyticsRead, roles[RoleNames.Commercial]);

        Assert.Contains(PermissionCodes.ProceduresRead, roles[RoleNames.TenderCommission]);
        Assert.DoesNotContain(PermissionCodes.ProceduresUpdate, roles[RoleNames.TenderCommission]);
        Assert.DoesNotContain(PermissionCodes.ImportsWrite, roles[RoleNames.TenderCommission]);
        Assert.Contains(PermissionCodes.SlaRead, roles[RoleNames.TenderCommission]);
        Assert.Contains(PermissionCodes.AnalyticsRead, roles[RoleNames.TenderCommission]);

        Assert.Contains(PermissionCodes.ReferenceDataRead, roles[RoleNames.Planner]);
        Assert.DoesNotContain(PermissionCodes.ReferenceDataWrite, roles[RoleNames.Planner]);
        Assert.Contains(PermissionCodes.ImportsWrite, roles[RoleNames.Planner]);
        Assert.Contains(PermissionCodes.AnalyticsRead, roles[RoleNames.Planner]);

        var allPermissionCodes = typeof(PermissionCodes)
            .GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)
            .Where(field => field.FieldType == typeof(string))
            .Select(field => (string?)field.GetValue(null))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        Assert.True(allPermissionCodes.Count > 0);
        Assert.True(allPermissionCodes.IsSubsetOf(roles[RoleNames.Administrator]));
    }
}
