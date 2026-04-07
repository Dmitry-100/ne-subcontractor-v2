using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataServiceTests
{
    [Fact]
    public async Task UpsertAsync_ShouldNormalizeTypeAndItemCode()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ReferenceDataService(db);

        var saved = await service.UpsertAsync("purchase_type", new UpsertReferenceDataItemRequest
        {
            ItemCode = "capex",
            DisplayName = "CAPEX purchase",
            SortOrder = 15,
            IsActive = true
        });

        Assert.Equal("PURCHASE_TYPE", saved.TypeCode);
        Assert.Equal("CAPEX", saved.ItemCode);
        Assert.Equal("CAPEX purchase", saved.DisplayName);
        Assert.Equal(15, saved.SortOrder);
        Assert.True(saved.IsActive);

        var persisted = await db.Set<ReferenceDataEntry>()
            .AsNoTracking()
            .SingleAsync(x => x.TypeCode == "PURCHASE_TYPE" && x.ItemCode == "CAPEX");

        Assert.Equal("CAPEX purchase", persisted.DisplayName);
    }

    [Fact]
    public async Task ListAsync_ActiveOnly_ShouldReturnOnlyActiveItems()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ReferenceDataService(db);

        await db.Set<ReferenceDataEntry>().AddRangeAsync(
            new ReferenceDataEntry
            {
                TypeCode = "PURCHASE_TYPE",
                ItemCode = "A",
                DisplayName = "Active item",
                SortOrder = 10,
                IsActive = true
            },
            new ReferenceDataEntry
            {
                TypeCode = "PURCHASE_TYPE",
                ItemCode = "Z",
                DisplayName = "Inactive item",
                SortOrder = 20,
                IsActive = false
            },
            new ReferenceDataEntry
            {
                TypeCode = "OTHER_TYPE",
                ItemCode = "A",
                DisplayName = "Other type item",
                SortOrder = 5,
                IsActive = true
            });
        await db.SaveChangesAsync();

        var activeOnly = await service.ListAsync("purchase_type", true);
        var all = await service.ListAsync("purchase_type", false);

        var activeItem = Assert.Single(activeOnly);
        Assert.Equal("A", activeItem.ItemCode);
        Assert.True(activeItem.IsActive);

        Assert.Equal(2, all.Count);
    }

    [Fact]
    public async Task DeleteAsync_ExistingItem_ShouldRemoveAndReturnTrue()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ReferenceDataService(db);

        await db.Set<ReferenceDataEntry>().AddAsync(new ReferenceDataEntry
        {
            TypeCode = "ANALYTICS_LEVEL_1",
            ItemCode = "STEEL",
            DisplayName = "Steel",
            SortOrder = 1,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var deleted = await service.DeleteAsync("analytics_level_1", "steel");
        var stillExists = await db.Set<ReferenceDataEntry>()
            .AnyAsync(x => x.TypeCode == "ANALYTICS_LEVEL_1" && x.ItemCode == "STEEL");

        Assert.True(deleted);
        Assert.False(stillExists);
    }
}
