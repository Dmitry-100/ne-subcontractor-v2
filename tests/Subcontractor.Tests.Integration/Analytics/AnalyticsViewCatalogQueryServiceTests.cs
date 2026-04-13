using Subcontractor.Application.Analytics;

namespace Subcontractor.Tests.Integration.Analytics;

public sealed class AnalyticsViewCatalogQueryServiceTests
{
    [Fact]
    public async Task GetViewCatalogAsync_ShouldContainExpectedViewDescriptors()
    {
        var service = new AnalyticsViewCatalogQueryService();

        var catalog = await service.GetViewCatalogAsync();

        Assert.NotEmpty(catalog);
        Assert.Contains(catalog, x => x.ViewName == "vwAnalytics_LotFunnel");
        Assert.Contains(catalog, x => x.ViewName == "vwAnalytics_ContractorRatings");
        Assert.True(catalog.Count >= 7);
    }
}
