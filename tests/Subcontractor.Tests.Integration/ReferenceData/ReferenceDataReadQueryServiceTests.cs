using Subcontractor.Application.ReferenceData;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataReadQueryServiceTests
{
    [Fact]
    public async Task ListAsync_UnknownType_ShouldReturnEmptyList()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ReferenceDataReadQueryService(db);

        var result = await service.ListAsync("UNKNOWN_TYPE", activeOnly: false);

        Assert.Empty(result);
    }

    [Fact]
    public async Task ListAsync_ShouldApplyActiveFilterAndDeterministicSorting()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<ReferenceDataEntry>().AddRangeAsync(
            new ReferenceDataEntry
            {
                TypeCode = "PURCHASE_TYPE",
                ItemCode = "B",
                DisplayName = "Beta",
                SortOrder = 20,
                IsActive = true
            },
            new ReferenceDataEntry
            {
                TypeCode = "PURCHASE_TYPE",
                ItemCode = "C",
                DisplayName = "Alpha",
                SortOrder = 20,
                IsActive = true
            },
            new ReferenceDataEntry
            {
                TypeCode = "PURCHASE_TYPE",
                ItemCode = "A",
                DisplayName = "First",
                SortOrder = 10,
                IsActive = false
            });
        await db.SaveChangesAsync();

        var service = new ReferenceDataReadQueryService(db);
        var activeOnly = await service.ListAsync("purchase_type", activeOnly: true);
        var all = await service.ListAsync("purchase_type", activeOnly: false);

        Assert.Equal(new[] { "C", "B" }, activeOnly.Select(x => x.ItemCode).ToArray());
        Assert.Equal(new[] { "A", "C", "B" }, all.Select(x => x.ItemCode).ToArray());
    }
}
