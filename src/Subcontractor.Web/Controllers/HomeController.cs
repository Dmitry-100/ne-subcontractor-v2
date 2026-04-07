using Microsoft.AspNetCore.Mvc;

namespace Subcontractor.Web.Controllers;

public sealed class HomeController : Controller
{
    public IActionResult Index()
    {
        return View();
    }

    public IActionResult Projects()
    {
        return View();
    }

    public IActionResult Lots()
    {
        return View();
    }

    public IActionResult Procedures()
    {
        return View();
    }

    public IActionResult Contracts()
    {
        return View();
    }

    public IActionResult Contractors()
    {
        return View();
    }

    public IActionResult Admin()
    {
        return View();
    }

    public IActionResult Imports()
    {
        return View();
    }

    public IActionResult Sla()
    {
        return View();
    }
}
