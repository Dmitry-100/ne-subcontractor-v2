using Microsoft.AspNetCore.OutputCaching;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Admin;

public sealed class UsersControllerOutputCachePolicyTests
{
    [Fact]
    public void ListRoles_ShouldHaveAdminRolesOutputCachePolicy()
    {
        var action = typeof(UsersController).GetMethod(nameof(UsersController.ListRoles));
        Assert.NotNull(action);

        var outputCache = action!
            .GetCustomAttributes(typeof(OutputCacheAttribute), inherit: false)
            .Cast<OutputCacheAttribute>()
            .Single();

        Assert.Equal(WebServiceCollectionExtensions.AdminRolesReadOutputCachePolicyName, outputCache.PolicyName);
    }
}
