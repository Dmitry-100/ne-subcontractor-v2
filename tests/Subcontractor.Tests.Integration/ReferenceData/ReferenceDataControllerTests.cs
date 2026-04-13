using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataControllerTests
{
    [Fact]
    public async Task List_WithBlankTypeCode_ShouldReturnBadRequest()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.List("   ", activeOnly: false, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Equal("Ошибка валидации.", problem.Title);
        Assert.Contains("Type code is required", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Upsert_ShouldReturnOkWithNormalizedCodes()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Upsert(
            "purchase_type",
            new UpsertReferenceDataItemRequest
            {
                ItemCode = "capex",
                DisplayName = "CAPEX purchase",
                SortOrder = 10,
                IsActive = true
            },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ReferenceDataItemDto>(ok.Value);
        Assert.Equal("PURCHASE_TYPE", payload.TypeCode);
        Assert.Equal("CAPEX", payload.ItemCode);
    }

    [Fact]
    public async Task Delete_NotFound_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Delete("PURCHASE_TYPE", "UNKNOWN", CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingItem_ShouldReturnNoContent()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<ReferenceDataEntry>().AddAsync(new ReferenceDataEntry
        {
            TypeCode = "PURCHASE_TYPE",
            ItemCode = "CAPEX",
            DisplayName = "CAPEX purchase",
            SortOrder = 1,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.Delete("purchase_type", "capex", CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }

    private static ReferenceDataController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var service = new ReferenceDataService(db);
        return new ReferenceDataController(service);
    }
}
