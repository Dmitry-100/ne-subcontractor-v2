using Subcontractor.Application.Imports;
using Subcontractor.Domain.Imports;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Imports;

public sealed class XmlSourceDataImportInboxReadQueryServiceTests
{
    [Fact]
    public async Task GetByIdAsync_WhenItemMissing_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new XmlSourceDataImportInboxReadQueryService(db);

        var item = await service.GetByIdAsync(Guid.NewGuid(), CancellationToken.None);

        Assert.Null(item);
    }

    [Fact]
    public async Task ListAsync_ShouldReturnPersistedItems()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<XmlSourceDataImportInboxItem>().AddRangeAsync(
            new XmlSourceDataImportInboxItem
            {
                SourceSystem = "ExpressPlanning",
                FileName = "first.xml",
                XmlContent = "<rows><row projectCode=\"PRJ-1\" objectWbs=\"A.01\" disciplineCode=\"PIP\" manHours=\"1\" /></rows>",
                Status = XmlSourceDataImportInboxStatus.Received
            },
            new XmlSourceDataImportInboxItem
            {
                SourceSystem = "ExpressPlanning",
                FileName = "second.xml",
                XmlContent = "<rows><row projectCode=\"PRJ-2\" objectWbs=\"A.02\" disciplineCode=\"ELEC\" manHours=\"2\" /></rows>",
                Status = XmlSourceDataImportInboxStatus.Failed,
                ErrorMessage = "test"
            });
        await db.SaveChangesAsync();

        var service = new XmlSourceDataImportInboxReadQueryService(db);
        var items = await service.ListAsync(CancellationToken.None);

        Assert.Equal(2, items.Count);
        Assert.Contains(items, x => x.FileName == "first.xml");
        Assert.Contains(items, x => x.FileName == "second.xml" && x.Status == XmlSourceDataImportInboxStatus.Failed);
    }
}
