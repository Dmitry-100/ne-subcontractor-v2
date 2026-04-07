using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Exports;
using Subcontractor.Application.Lots;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.Projects;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Exports;

public sealed class ExportsControllerTests
{
    [Fact]
    public async Task ExportProjects_ShouldReturnCsvFile()
    {
        await using var db = TestDbContextFactory.Create("export.user");

        var role = new AppRole
        {
            Name = "EXPORT_ROLE",
            Description = "Export role"
        };
        role.Permissions.Add(new RolePermission
        {
            AppRole = role,
            PermissionCode = PermissionCodes.ProjectsRead
        });

        var user = new AppUser
        {
            ExternalId = "ext-export.user",
            Login = "export.user",
            DisplayName = "Export User",
            Email = "export.user@example.com",
            IsActive = true
        };
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = role
        });

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);
        await db.Set<Project>().AddAsync(new Project
        {
            Code = "EXP-001",
            Name = "Exported Project",
            GipUserId = user.Id
        });
        await db.SaveChangesAsync();

        var currentUser = new TestCurrentUserService("export.user");
        var exportService = new RegistryExportService(
            new ProjectsService(db, currentUser),
            new ContractorsService(db),
            new LotsService(db),
            new ProcurementProceduresService(db, currentUser),
            new ContractsService(db));
        var controller = new ExportsController(exportService);

        var result = await controller.ExportProjects(null, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv; charset=utf-8", file.ContentType);
        Assert.StartsWith("projects-", file.FileDownloadName, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(file.FileContents);
    }
}
