using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ReferenceData;
using Subcontractor.Application.ReferenceData.Models;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataWriteWorkflowServiceTests
{
    [Fact]
    public async Task UpsertAsync_ShouldNormalizeCodesAndCreateEntry()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ReferenceDataWriteWorkflowService(db);

        var saved = await service.UpsertAsync("purchase_type", new UpsertReferenceDataItemRequest
        {
            ItemCode = "capex",
            DisplayName = " CAPEX purchase ",
            SortOrder = 15,
            IsActive = true
        });

        Assert.Equal("PURCHASE_TYPE", saved.TypeCode);
        Assert.Equal("CAPEX", saved.ItemCode);
        Assert.Equal("CAPEX purchase", saved.DisplayName);

        var persisted = await db.Set<ReferenceDataEntry>()
            .AsNoTracking()
            .SingleAsync(x => x.TypeCode == "PURCHASE_TYPE" && x.ItemCode == "CAPEX");
        Assert.Equal("CAPEX purchase", persisted.DisplayName);
    }

    [Fact]
    public async Task UpsertAsync_ExistingEntry_ShouldUpdateFields()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<ReferenceDataEntry>().AddAsync(new ReferenceDataEntry
        {
            TypeCode = "PURCHASE_TYPE",
            ItemCode = "CAPEX",
            DisplayName = "Old",
            SortOrder = 1,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var service = new ReferenceDataWriteWorkflowService(db);
        var updated = await service.UpsertAsync("purchase_type", new UpsertReferenceDataItemRequest
        {
            ItemCode = "capex",
            DisplayName = " Updated display ",
            SortOrder = 50,
            IsActive = false
        });

        Assert.Equal("Updated display", updated.DisplayName);
        Assert.Equal(50, updated.SortOrder);
        Assert.False(updated.IsActive);
    }

    [Fact]
    public async Task UpsertAsync_EmptyDisplayName_ShouldThrowArgumentException()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ReferenceDataWriteWorkflowService(db);

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertAsync(
            "PURCHASE_TYPE",
            new UpsertReferenceDataItemRequest
            {
                ItemCode = "CAPEX",
                DisplayName = "  ",
                SortOrder = 1,
                IsActive = true
            }));

        Assert.Equal("DisplayName", error.ParamName);
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalseForUnknown_AndDeleteExisting()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ReferenceDataWriteWorkflowService(db);

        var unknownDeleted = await service.DeleteAsync("PURCHASE_TYPE", "UNKNOWN");
        Assert.False(unknownDeleted);

        await db.Set<ReferenceDataEntry>().AddAsync(new ReferenceDataEntry
        {
            TypeCode = "PURCHASE_TYPE",
            ItemCode = "CAPEX",
            DisplayName = "CAPEX purchase",
            SortOrder = 10,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var deleted = await service.DeleteAsync("purchase_type", "capex");
        Assert.True(deleted);

        var exists = await db.Set<ReferenceDataEntry>()
            .AnyAsync(x => x.TypeCode == "PURCHASE_TYPE" && x.ItemCode == "CAPEX");
        Assert.False(exists);
    }
}
