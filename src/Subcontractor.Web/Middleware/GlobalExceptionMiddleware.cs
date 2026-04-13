using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Subcontractor.Web.Middleware;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            _logger.LogInformation(
                "Request canceled by client. Path: {Path}. CorrelationId: {CorrelationId}",
                context.Request.Path,
                context.TraceIdentifier);
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogWarning("Cannot write ProblemDetails because response has already started.");
                throw;
            }

            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = context.TraceIdentifier;
        _logger.LogError(
            exception,
            "Unhandled exception for {Method} {Path}. CorrelationId: {CorrelationId}",
            context.Request.Method,
            context.Request.Path,
            correlationId);

        context.Response.Clear();
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Непредвиденная ошибка сервера.",
            Detail = "Произошла непредвиденная ошибка. При обращении в поддержку укажите correlationId.",
            Type = "https://httpstatuses.com/500",
            Instance = context.Request.Path
        };
        problem.Extensions["correlationId"] = correlationId;

        var payload = JsonSerializer.Serialize(problem);
        await context.Response.WriteAsync(payload, context.RequestAborted);
    }
}
