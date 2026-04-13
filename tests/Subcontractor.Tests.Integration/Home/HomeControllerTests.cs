using Microsoft.AspNetCore.Mvc;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Home;

public sealed class HomeControllerTests
{
    public static TheoryData<string, Func<HomeController, IActionResult>> ViewActions => new()
    {
        { nameof(HomeController.Index), controller => controller.Index() },
        { nameof(HomeController.Projects), controller => controller.Projects() },
        { nameof(HomeController.Lots), controller => controller.Lots() },
        { nameof(HomeController.Procedures), controller => controller.Procedures() },
        { nameof(HomeController.Contracts), controller => controller.Contracts() },
        { nameof(HomeController.Contractors), controller => controller.Contractors() },
        { nameof(HomeController.Admin), controller => controller.Admin() },
        { nameof(HomeController.Imports), controller => controller.Imports() },
        { nameof(HomeController.Sla), controller => controller.Sla() }
    };

    public static TheoryData<string, string[]> ExpectedRoutesByAction => new()
    {
        { nameof(HomeController.Index), ["/", "/dashboard", "/Home", "/Home/Index"] },
        { nameof(HomeController.Projects), ["/projects", "/Home/Projects"] },
        { nameof(HomeController.Lots), ["/lots", "/Home/Lots"] },
        { nameof(HomeController.Procedures), ["/procedures", "/Home/Procedures"] },
        { nameof(HomeController.Contracts), ["/contracts", "/Home/Contracts"] },
        { nameof(HomeController.Contractors), ["/contractors", "/Home/Contractors"] },
        { nameof(HomeController.Admin), ["/admin", "/Home/Admin"] },
        { nameof(HomeController.Imports), ["/imports", "/Home/Imports"] },
        { nameof(HomeController.Sla), ["/sla", "/Home/Sla"] }
    };

    [Theory]
    [MemberData(nameof(ViewActions))]
    public void ViewActions_ShouldReturnDefaultViewResult(
        string _,
        Func<HomeController, IActionResult> action)
    {
        var controller = new HomeController();

        var result = action(controller);

        var view = Assert.IsType<ViewResult>(result);
        Assert.Null(view.ViewName);
    }

    [Theory]
    [MemberData(nameof(ExpectedRoutesByAction))]
    public void Actions_ShouldExposeExpectedHttpGetRoutes(string actionName, string[] expectedRoutes)
    {
        var action = typeof(HomeController).GetMethod(actionName);
        Assert.NotNull(action);

        var routes = action!
            .GetCustomAttributes(typeof(HttpGetAttribute), inherit: false)
            .Cast<HttpGetAttribute>()
            .Select(attribute => attribute.Template)
            .Where(template => !string.IsNullOrWhiteSpace(template))
            .Cast<string>()
            .ToHashSet(StringComparer.Ordinal);

        Assert.Equal(expectedRoutes.Length, routes.Count);
        foreach (var expectedRoute in expectedRoutes)
        {
            Assert.Contains(expectedRoute, routes);
        }
    }
}
