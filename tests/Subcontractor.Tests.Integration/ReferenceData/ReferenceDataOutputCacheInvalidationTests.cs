using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataOutputCacheInvalidationTests
{
    [Fact]
    public async Task Upsert_WhenSuccessful_ShouldEvictReferenceDataTag()
    {
        var service = new StubReferenceDataService
        {
            UpsertAsyncHandler = (typeCode, request, _) => Task.FromResult(new ReferenceDataItemDto(
                typeCode.ToUpperInvariant(),
                request.ItemCode.ToUpperInvariant(),
                request.DisplayName,
                request.SortOrder,
                request.IsActive))
        };
        var cacheStore = new RecordingOutputCacheStore();
        var controller = new ReferenceDataController(service, cacheStore);

        await controller.Upsert(
            "purchase_type",
            new UpsertReferenceDataItemRequest
            {
                ItemCode = "open",
                DisplayName = "Open tender",
                SortOrder = 1,
                IsActive = true
            },
            CancellationToken.None);

        Assert.Equal([WebServiceCollectionExtensions.ReferenceDataOutputCacheTag], cacheStore.EvictedTags);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ShouldNotEvictReferenceDataTag()
    {
        var service = new StubReferenceDataService
        {
            DeleteAsyncHandler = (_, _, _) => Task.FromResult(false)
        };
        var cacheStore = new RecordingOutputCacheStore();
        var controller = new ReferenceDataController(service, cacheStore);

        await controller.Delete("purchase_type", "unknown", CancellationToken.None);

        Assert.Empty(cacheStore.EvictedTags);
    }

    [Fact]
    public async Task Delete_WhenSuccessful_ShouldEvictReferenceDataTag()
    {
        var service = new StubReferenceDataService
        {
            DeleteAsyncHandler = (_, _, _) => Task.FromResult(true)
        };
        var cacheStore = new RecordingOutputCacheStore();
        var controller = new ReferenceDataController(service, cacheStore);

        await controller.Delete("purchase_type", "open", CancellationToken.None);

        Assert.Equal([WebServiceCollectionExtensions.ReferenceDataOutputCacheTag], cacheStore.EvictedTags);
    }

    private sealed class StubReferenceDataService : IReferenceDataService
    {
        public Func<string, bool, CancellationToken, Task<IReadOnlyList<ReferenceDataItemDto>>> ListAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult<IReadOnlyList<ReferenceDataItemDto>>([]);

        public Func<string, UpsertReferenceDataItemRequest, CancellationToken, Task<ReferenceDataItemDto>> UpsertAsyncHandler { get; set; } =
            static (_, request, _) => Task.FromResult(new ReferenceDataItemDto(
                "PURCHASE_TYPE",
                request.ItemCode?.ToUpperInvariant() ?? "UNKNOWN",
                request.DisplayName ?? "Unknown",
                request.SortOrder,
                request.IsActive));

        public Func<string, string, CancellationToken, Task<bool>> DeleteAsyncHandler { get; set; } =
            static (_, _, _) => Task.FromResult(true);

        public Task<IReadOnlyList<ReferenceDataItemDto>> ListAsync(
            string typeCode,
            bool activeOnly,
            CancellationToken cancellationToken = default)
            => ListAsyncHandler(typeCode, activeOnly, cancellationToken);

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

    private sealed class RecordingOutputCacheStore : IOutputCacheStore
    {
        public List<string> EvictedTags { get; } = [];

        public ValueTask<byte[]?> GetAsync(string key, CancellationToken cancellationToken)
            => ValueTask.FromResult<byte[]?>(null);

        public ValueTask SetAsync(string key, byte[] value, string[]? tags, TimeSpan validFor, CancellationToken cancellationToken)
            => ValueTask.CompletedTask;

        public ValueTask EvictByTagAsync(string tag, CancellationToken cancellationToken)
        {
            EvictedTags.Add(tag);
            return ValueTask.CompletedTask;
        }
    }
}
