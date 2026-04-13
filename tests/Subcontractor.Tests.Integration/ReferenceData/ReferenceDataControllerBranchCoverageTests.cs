using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataControllerBranchCoverageTests
{
    [Fact]
    public async Task Endpoints_ShouldCoverSuccessBranches()
    {
        var service = new StubReferenceDataService();
        var controller = new ReferenceDataController(service);

        var list = await controller.List("PURCHASE_TYPE", activeOnly: true, CancellationToken.None);
        var upsert = await controller.Upsert(
            "PURCHASE_TYPE",
            new UpsertReferenceDataItemRequest
            {
                ItemCode = "OPEN",
                DisplayName = "Open tender",
                SortOrder = 1,
                IsActive = true
            },
            CancellationToken.None);
        var deleteNoContent = await controller.Delete("PURCHASE_TYPE", "OPEN", CancellationToken.None);

        Assert.IsType<OkObjectResult>(list.Result);
        Assert.IsType<OkObjectResult>(upsert.Result);
        Assert.IsType<NoContentResult>(deleteNoContent);
        Assert.True(service.CapturedActiveOnly);
    }

    [Fact]
    public async Task Delete_WhenItemNotFound_ShouldReturnNotFound()
    {
        var service = new StubReferenceDataService
        {
            DeleteAsyncHandler = (_, _, _) => Task.FromResult(false)
        };
        var controller = new ReferenceDataController(service);

        var result = await controller.Delete("PURCHASE_TYPE", "UNKNOWN", CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Endpoints_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubReferenceDataService
        {
            ListAsyncHandler = (_, _, _) => throw new ArgumentException("Type code is required."),
            UpsertAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid upsert payload."),
            DeleteAsyncHandler = (_, _, _) => throw new ArgumentException("Invalid delete payload.")
        };
        var controller = new ReferenceDataController(service);

        var list = await controller.List("", activeOnly: false, CancellationToken.None);
        var upsert = await controller.Upsert(
            "PURCHASE_TYPE",
            new UpsertReferenceDataItemRequest
            {
                ItemCode = "OPEN",
                DisplayName = "Open tender"
            },
            CancellationToken.None);
        var delete = await controller.Delete("PURCHASE_TYPE", "", CancellationToken.None);

        AssertBadRequest(list.Result);
        AssertBadRequest(upsert.Result);
        AssertBadRequest(delete);
    }

    private static void AssertBadRequest(IActionResult? result)
    {
        var objectResult = Assert.IsAssignableFrom<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
    }

    private static ReferenceDataItemDto CreateItem()
    {
        return new ReferenceDataItemDto(
            "PURCHASE_TYPE",
            "OPEN",
            "Open tender",
            1,
            true);
    }

    private sealed class StubReferenceDataService : IReferenceDataService
    {
        public bool CapturedActiveOnly { get; private set; }

        public Func<string, bool, CancellationToken, Task<IReadOnlyList<ReferenceDataItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ReferenceDataItemDto>>(new[] { CreateItem() });

        public Func<string, UpsertReferenceDataItemRequest, CancellationToken, Task<ReferenceDataItemDto>> UpsertAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(CreateItem());

        public Func<string, string, CancellationToken, Task<bool>> DeleteAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(true);

        public Task<IReadOnlyList<ReferenceDataItemDto>> ListAsync(
            string typeCode,
            bool activeOnly,
            CancellationToken cancellationToken = default)
        {
            CapturedActiveOnly = activeOnly;
            return ListAsyncHandler(typeCode, activeOnly, cancellationToken);
        }

        public Task<ReferenceDataItemDto> UpsertAsync(
            string typeCode,
            UpsertReferenceDataItemRequest request,
            CancellationToken cancellationToken = default)
            => UpsertAsyncHandler(typeCode, request, cancellationToken);

        public Task<bool> DeleteAsync(
            string typeCode,
            string itemCode,
            CancellationToken cancellationToken = default)
            => DeleteAsyncHandler(typeCode, itemCode, cancellationToken);
    }
}
