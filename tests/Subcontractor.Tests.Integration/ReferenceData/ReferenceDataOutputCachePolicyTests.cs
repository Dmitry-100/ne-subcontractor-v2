using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.ReferenceData;

public sealed class ReferenceDataOutputCachePolicyTests
{
    [Fact]
    public void List_ShouldHaveReferenceDataOutputCachePolicy()
    {
        var action = typeof(ReferenceDataController).GetMethod(nameof(ReferenceDataController.List));
        Assert.NotNull(action);

        var outputCache = action!
            .GetCustomAttributes(typeof(OutputCacheAttribute), inherit: false)
            .Cast<OutputCacheAttribute>()
            .Single();

        Assert.Equal(WebServiceCollectionExtensions.ReferenceDataReadOutputCachePolicyName, outputCache.PolicyName);
    }
}
