using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.StaticFiles;
using Subcontractor.Web.Middleware;

namespace Subcontractor.Web.Configuration;

public static class WebApplicationPipelineExtensions
{
    private static readonly HashSet<string> CacheableStaticAssetExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".css",
        ".gif",
        ".ico",
        ".jpg",
        ".jpeg",
        ".js",
        ".png",
        ".svg",
        ".ttf",
        ".woff",
        ".woff2"
    };

    public static IReadOnlyList<string> SupportedCultureNames { get; } = ["ru-RU", "en-US"];

    public static RequestLocalizationOptions CreateRequestLocalizationOptions()
    {
        var supportedCultures = SupportedCultureNames
            .Select(code => new CultureInfo(code))
            .ToArray();

        return new RequestLocalizationOptions
        {
            DefaultRequestCulture = new RequestCulture("ru-RU"),
            SupportedCultures = supportedCultures,
            SupportedUICultures = supportedCultures
        };
    }

    public static bool IsCacheableStaticAssetPath(PathString requestPath)
    {
        var extension = Path.GetExtension(requestPath.Value);
        return !string.IsNullOrWhiteSpace(extension) && CacheableStaticAssetExtensions.Contains(extension);
    }

    public static string GetStaticAssetCacheControlHeader(PathString requestPath, bool hasVersionToken)
    {
        if (!IsCacheableStaticAssetPath(requestPath))
        {
            return "public,max-age=60";
        }

        return hasVersionToken
            ? "public,max-age=31536000,immutable"
            : "public,max-age=300";
    }

    public static StaticFileOptions CreateStaticFileOptions()
    {
        return new StaticFileOptions
        {
            OnPrepareResponse = context =>
            {
                var cacheControl = GetStaticAssetCacheControlHeader(
                    context.Context.Request.Path,
                    context.Context.Request.Query.ContainsKey("v"));
                context.Context.Response.Headers.CacheControl = cacheControl;
            }
        };
    }

    public static WebApplication UseSubcontractorPipeline(this WebApplication app)
    {
        app.UseResponseCompression();
        app.UseRequestLocalization(CreateRequestLocalizationOptions());
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<GlobalExceptionMiddleware>();
        app.UseHttpsRedirection();
        app.UseStaticFiles(CreateStaticFileOptions());
        app.UseRouting();
        app.UseOutputCache();
        app.UseAuthentication();
        app.UseMiddleware<CurrentUserProvisioningMiddleware>();
        app.UseAuthorization();

        app.MapControllers();
        app.MapControllerRoute(
            name: "default",
            pattern: "{controller=Home}/{action=Index}/{id?}");

        return app;
    }
}
