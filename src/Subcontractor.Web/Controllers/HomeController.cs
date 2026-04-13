using Microsoft.AspNetCore.Mvc;

namespace Subcontractor.Web.Controllers;

public sealed class HomeController : Controller
{
    [HttpGet("/")]
    [HttpGet("/dashboard")]
    [HttpGet("/Home")]
    [HttpGet("/Home/Index")]
    public IActionResult Index()
    {
        return View();
    }

    [HttpGet("/projects")]
    [HttpGet("/Home/Projects")]
    public IActionResult Projects()
    {
        return View();
    }

    [HttpGet("/lots")]
    [HttpGet("/Home/Lots")]
    public IActionResult Lots()
    {
        return View();
    }

    [HttpGet("/procedures")]
    [HttpGet("/Home/Procedures")]
    public IActionResult Procedures()
    {
        return View();
    }

    [HttpGet("/contracts")]
    [HttpGet("/Home/Contracts")]
    public IActionResult Contracts()
    {
        return View();
    }

    [HttpGet("/contractors")]
    [HttpGet("/Home/Contractors")]
    public IActionResult Contractors()
    {
        return View();
    }

    [HttpGet("/admin")]
    [HttpGet("/Home/Admin")]
    public IActionResult Admin()
    {
        return View();
    }

    [HttpGet("/imports")]
    [HttpGet("/Home/Imports")]
    public IActionResult Imports()
    {
        return View();
    }

    [HttpGet("/sla")]
    [HttpGet("/Home/Sla")]
    public IActionResult Sla()
    {
        return View();
    }
}
