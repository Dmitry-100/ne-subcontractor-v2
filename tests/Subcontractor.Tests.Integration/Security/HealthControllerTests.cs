using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Security;

public sealed class HealthControllerTests
{
    [Fact]
    public void Get_ShouldReturnHealthyPayload()
    {
        var controller = new HealthController();
        var before = DateTimeOffset.UtcNow.AddMinutes(-1);

        var result = controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
        using var payload = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));

        Assert.Equal("Subcontractor.Web", payload.RootElement.GetProperty("service").GetString());
        Assert.Equal("healthy", payload.RootElement.GetProperty("status").GetString());

        var timestampRaw = payload.RootElement.GetProperty("timestampUtc").GetString();
        Assert.NotNull(timestampRaw);
        Assert.True(DateTimeOffset.TryParse(timestampRaw, out var timestampUtc));
        Assert.InRange(timestampUtc, before, DateTimeOffset.UtcNow.AddMinutes(1));
    }

    [Fact]
    public void Get_ShouldHaveOutputCachePolicy()
    {
        var action = typeof(HealthController).GetMethod(nameof(HealthController.Get));
        Assert.NotNull(action);

        var outputCache = action!
            .GetCustomAttributes(typeof(OutputCacheAttribute), inherit: false)
            .Cast<OutputCacheAttribute>()
            .Single();

        Assert.Equal(WebServiceCollectionExtensions.HealthCheckOutputCachePolicyName, outputCache.PolicyName);
    }

    [Fact]
    public void Controller_ShouldHaveExpectedRouteTemplate()
    {
        var routeAttribute = typeof(HealthController)
            .GetCustomAttributes(typeof(RouteAttribute), inherit: false)
            .Cast<RouteAttribute>()
            .Single();

        Assert.Equal("api/health", routeAttribute.Template);
    }
}
