using System.Text;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Exports;
using Subcontractor.Application.Lots;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.Projects;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Exports;

public sealed class RegistryExportServiceTests
{
    [Fact]
    public async Task ExportProjectsAsync_ShouldRespectProjectScopeAndEscapeCsv()
    {
        await using var db = TestDbContextFactory.Create("scope.user");

        var role = CreateRole("SCOPE_ROLE", PermissionCodes.ProjectsRead);
        var user = CreateUser("scope.user");
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = role
        });

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);

        await db.Set<Project>().AddRangeAsync(
            new Project
            {
                Code = "OWN-001",
                Name = "Scope \"Alpha, Beta\"",
                GipUserId = user.Id
            },
            new Project
            {
                Code = "FOREIGN-001",
                Name = "Foreign Project",
                GipUserId = Guid.NewGuid()
            });
        await db.SaveChangesAsync();

        var currentUser = new TestCurrentUserService("scope.user");
        var service = CreateService(db, currentUser);

        var export = await service.ExportProjectsAsync(null);
        var csv = DecodeCsv(export.Content);

        Assert.StartsWith("projects-", export.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Id,Code,Name,GipUserId", csv);
        Assert.Contains("OWN-001", csv);
        Assert.Contains("\"Scope \"\"Alpha, Beta\"\"\"", csv);
        Assert.DoesNotContain("FOREIGN-001", csv);
    }

    [Fact]
    public async Task ExportContractsAsync_ShouldApplyFilters()
    {
        await using var db = TestDbContextFactory.Create("contracts.user");

        await db.Set<Contract>().AddRangeAsync(
            new Contract
            {
                LotId = Guid.NewGuid(),
                ProcedureId = Guid.NewGuid(),
                ContractorId = Guid.NewGuid(),
                ContractNumber = "CTR-ACTIVE",
                AmountWithoutVat = 100m,
                VatAmount = 20m,
                TotalAmount = 120m,
                Status = ContractStatus.Active
            },
            new Contract
            {
                LotId = Guid.NewGuid(),
                ProcedureId = Guid.NewGuid(),
                ContractorId = Guid.NewGuid(),
                ContractNumber = "CTR-DRAFT",
                AmountWithoutVat = 10m,
                VatAmount = 2m,
                TotalAmount = 12m,
                Status = ContractStatus.Draft
            });
        await db.SaveChangesAsync();

        var currentUser = new TestCurrentUserService("contracts.user");
        var service = CreateService(db, currentUser);

        var export = await service.ExportContractsAsync(null, ContractStatus.Active, null, null, null);
        var csv = DecodeCsv(export.Content);

        Assert.Contains("CTR-ACTIVE", csv);
        Assert.DoesNotContain("CTR-DRAFT", csv);
    }

    private static RegistryExportService CreateService(
        Infrastructure.Persistence.AppDbContext db,
        TestCurrentUserService currentUser)
    {
        return new RegistryExportService(
            new ProjectsService(db, currentUser),
            new ContractorsService(db),
            new LotsService(db),
            new ProcurementProceduresService(db, currentUser),
            new ContractsService(db));
    }

    private static AppRole CreateRole(string name, params string[] permissionCodes)
    {
        var role = new AppRole
        {
            Name = name,
            Description = "Export test role"
        };

        foreach (var code in permissionCodes)
        {
            role.Permissions.Add(new RolePermission
            {
                AppRole = role,
                PermissionCode = code
            });
        }

        return role;
    }

    private static AppUser CreateUser(string login)
    {
        return new AppUser
        {
            ExternalId = $"ext-{login}",
            Login = login,
            DisplayName = login,
            Email = $"{login}@example.com",
            IsActive = true
        };
    }

    private static string DecodeCsv(byte[] bytes)
    {
        var text = Encoding.UTF8.GetString(bytes);
        return text.TrimStart('\uFEFF');
    }
}
