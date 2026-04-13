using Microsoft.AspNetCore.Mvc;

namespace Subcontractor.Web.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected ActionResult BadRequestProblem(string detail, string? title = null)
    {
        return BadRequest(CreateProblemDetails(
            StatusCodes.Status400BadRequest,
            title ?? "Ошибка валидации.",
            detail));
    }

    protected ActionResult ConflictProblem(string detail, string? title = null)
    {
        return Conflict(CreateProblemDetails(
            StatusCodes.Status409Conflict,
            title ?? "Конфликт бизнес-правил.",
            detail));
    }

    protected ActionResult NotFoundProblem(string detail, string? title = null)
    {
        return NotFound(CreateProblemDetails(
            StatusCodes.Status404NotFound,
            title ?? "Ресурс не найден.",
            detail));
    }

    private ProblemDetails CreateProblemDetails(int statusCode, string title, string detail)
    {
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.com/{statusCode}",
            Instance = HttpContext?.Request.Path
        };

        var correlationId = HttpContext?.TraceIdentifier;
        if (!string.IsNullOrWhiteSpace(correlationId))
        {
            problemDetails.Extensions["correlationId"] = correlationId;
        }

        return problemDetails;
    }
}
