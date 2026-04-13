using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Subcontractor.Web.Middleware;

namespace Subcontractor.Tests.Integration.Security;

public sealed class ApiHardeningMiddlewareTests
{
    [Fact]
    public async Task CorrelationIdMiddleware_ShouldReuseIncomingHeader()
    {
        const string incomingCorrelationId = "corr-123";

        var context = new DefaultHttpContext();
        context.Request.Headers[CorrelationIdMiddleware.HeaderName] = incomingCorrelationId;
        context.Response.Body = new MemoryStream();

        string? observedTraceIdentifier = null;
        var middleware = new CorrelationIdMiddleware(async httpContext =>
        {
            observedTraceIdentifier = httpContext.TraceIdentifier;
            await httpContext.Response.WriteAsync("ok");
        }, NullLogger<CorrelationIdMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(incomingCorrelationId, observedTraceIdentifier);
        Assert.Equal(incomingCorrelationId, context.Response.Headers[CorrelationIdMiddleware.HeaderName].ToString());
    }

    [Fact]
    public async Task CorrelationIdMiddleware_ShouldGenerateHeaderWhenMissing()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        string? observedTraceIdentifier = null;
        var middleware = new CorrelationIdMiddleware(async httpContext =>
        {
            observedTraceIdentifier = httpContext.TraceIdentifier;
            await httpContext.Response.WriteAsync("ok");
        }, NullLogger<CorrelationIdMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        var headerValue = context.Response.Headers[CorrelationIdMiddleware.HeaderName].ToString();
        Assert.False(string.IsNullOrWhiteSpace(headerValue));
        Assert.Equal(observedTraceIdentifier, headerValue);
    }

    [Fact]
    public async Task GlobalExceptionMiddleware_ShouldReturnProblemDetailsWithCorrelationId()
    {
        var context = new DefaultHttpContext();
        context.TraceIdentifier = "corr-500";
        context.Request.Path = "/api/test";
        context.Response.Body = new MemoryStream();

        var middleware = new GlobalExceptionMiddleware(
            _ => throw new InvalidOperationException("Boom"),
            NullLogger<GlobalExceptionMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.StartsWith("application/problem+json", context.Response.ContentType);

        context.Response.Body.Position = 0;
        using var document = await JsonDocument.ParseAsync(context.Response.Body);
        var payload = document.RootElement;

        Assert.Equal(StatusCodes.Status500InternalServerError, payload.GetProperty("status").GetInt32());
        Assert.Equal("Непредвиденная ошибка сервера.", payload.GetProperty("title").GetString());
        Assert.Equal("corr-500", payload.GetProperty("correlationId").GetString());
    }
}
