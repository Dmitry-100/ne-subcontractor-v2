using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Analytics;

public sealed class AnalyticsControllerOutputCachePolicyTests
{
    [Fact]
    public void GetKpiDashboard_ShouldHaveAnalyticsKpiOutputCachePolicy()
    {
        var method = typeof(AnalyticsController).GetMethod(nameof(AnalyticsController.GetKpiDashboard));
        Assert.NotNull(method);

        var outputCache = method!
            .GetCustomAttributes(typeof(OutputCacheAttribute), inherit: true)
            .OfType<OutputCacheAttribute>()
            .SingleOrDefault();

        Assert.NotNull(outputCache);
        Assert.Equal(WebServiceCollectionExtensions.AnalyticsKpiReadOutputCachePolicyName, outputCache!.PolicyName);
    }

    [Fact]
    public void GetViewCatalog_ShouldHaveAnalyticsViewsOutputCachePolicy()
    {
        var method = typeof(AnalyticsController).GetMethod(nameof(AnalyticsController.GetViewCatalog));
        Assert.NotNull(method);

        var outputCache = method!
            .GetCustomAttributes(typeof(OutputCacheAttribute), inherit: true)
            .OfType<OutputCacheAttribute>()
            .SingleOrDefault();

        Assert.NotNull(outputCache);
        Assert.Equal(WebServiceCollectionExtensions.AnalyticsViewsReadOutputCachePolicyName, outputCache!.PolicyName);
    }
}
