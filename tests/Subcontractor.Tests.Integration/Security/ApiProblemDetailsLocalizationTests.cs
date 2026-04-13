using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Security;

public sealed class ApiProblemDetailsLocalizationTests
{
    [Fact]
    public void BadRequestProblem_ShouldUseRussianDefaultTitle_AndCorrelationId()
    {
        var controller = CreateController();

        var result = controller.InvokeBadRequest("Некорректные данные.");

        var response = Assert.IsType<BadRequestObjectResult>(result);
        var problem = Assert.IsType<ProblemDetails>(response.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Equal("Ошибка валидации.", problem.Title);
        Assert.Equal("Некорректные данные.", problem.Detail);
        Assert.Equal("/api/test-problem-details", problem.Instance);
        Assert.Equal("corr-api-tests", problem.Extensions["correlationId"]);
    }

    [Fact]
    public void ConflictProblem_ShouldUseRussianDefaultTitle()
    {
        var controller = CreateController();

        var result = controller.InvokeConflict("Переход в статус запрещен.");

        var response = Assert.IsType<ConflictObjectResult>(result);
        var problem = Assert.IsType<ProblemDetails>(response.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal("Конфликт бизнес-правил.", problem.Title);
        Assert.Equal("Переход в статус запрещен.", problem.Detail);
    }

    [Fact]
    public void NotFoundProblem_ShouldUseRussianDefaultTitle()
    {
        var controller = CreateController();

        var result = controller.InvokeNotFound("Сущность не найдена.");

        var response = Assert.IsType<NotFoundObjectResult>(result);
        var problem = Assert.IsType<ProblemDetails>(response.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
        Assert.Equal("Ресурс не найден.", problem.Title);
        Assert.Equal("Сущность не найдена.", problem.Detail);
    }

    private static ProblemControllerProbe CreateController()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.TraceIdentifier = "corr-api-tests";
        httpContext.Request.Path = "/api/test-problem-details";

        return new ProblemControllerProbe
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            }
        };
    }

    private sealed class ProblemControllerProbe : ApiControllerBase
    {
        public ActionResult InvokeBadRequest(string detail) => BadRequestProblem(detail);

        public ActionResult InvokeConflict(string detail) => ConflictProblem(detail);

        public ActionResult InvokeNotFound(string detail) => NotFoundProblem(detail);
    }
}
