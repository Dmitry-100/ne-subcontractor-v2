using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Microsoft.Extensions.Options;
using Subcontractor.Web.Configuration;

namespace Subcontractor.Tests.Integration.Security;

public sealed class WebApplicationPipelineExtensionsTests
{
    [Fact]
    public void SupportedCultureNames_ShouldContainRuAndEn()
    {
        var names = WebApplicationPipelineExtensions.SupportedCultureNames;
        Assert.Equal(2, names.Count);
        Assert.Equal("ru-RU", names[0]);
        Assert.Equal("en-US", names[1]);
    }

    [Fact]
    public void CreateRequestLocalizationOptions_ShouldConfigureDefaultCultureAndSupportedCultures()
    {
        var options = WebApplicationPipelineExtensions.CreateRequestLocalizationOptions();
        var supportedCultureNames = options.SupportedCultures!.Select(culture => culture.Name).ToArray();
        var supportedUiCultureNames = options.SupportedUICultures!.Select(culture => culture.Name).ToArray();

        Assert.Equal("ru-RU", options.DefaultRequestCulture.Culture.Name);
        Assert.Equal("ru-RU", options.DefaultRequestCulture.UICulture.Name);
        Assert.Equal(2, supportedCultureNames.Length);
        Assert.Equal("ru-RU", supportedCultureNames[0]);
        Assert.Equal("en-US", supportedCultureNames[1]);
        Assert.Equal(2, supportedUiCultureNames.Length);
        Assert.Equal("ru-RU", supportedUiCultureNames[0]);
        Assert.Equal("en-US", supportedUiCultureNames[1]);
    }

    [Fact]
    public void UseSubcontractorPipeline_ShouldReturnSameApp()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddLogging();
        builder.Services
            .AddAuthentication("Test")
            .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("Test", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddControllersWithViews();

        var app = builder.Build();
        var returnedApp = app.UseSubcontractorPipeline();

        Assert.Same(app, returnedApp);
    }

    [Theory]
    [InlineData("/css/site.css", false, "public,max-age=300")]
    [InlineData("/css/site.css", true, "public,max-age=31536000,immutable")]
    [InlineData("/js/app.js", true, "public,max-age=31536000,immutable")]
    [InlineData("/api/dashboard/summary", false, "public,max-age=60")]
    public void GetStaticAssetCacheControlHeader_ShouldReturnExpectedPolicy(
        string requestPath,
        bool hasVersionToken,
        string expected)
    {
        var result = WebApplicationPipelineExtensions.GetStaticAssetCacheControlHeader(
            new PathString(requestPath),
            hasVersionToken);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void CreateStaticFileOptions_ShouldApplyImmutableCacheForVersionedAssets()
    {
        var options = WebApplicationPipelineExtensions.CreateStaticFileOptions();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = "/js/app.js";
        httpContext.Request.Query = new QueryCollection(new Dictionary<string, StringValues>
        {
            ["v"] = "hash"
        });
        var responseContext = new StaticFileResponseContext(
            httpContext,
            new TestFileInfo("app.js"));

        options.OnPrepareResponse!(responseContext);

        Assert.Equal("public,max-age=31536000,immutable", httpContext.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public void CreateStaticFileOptions_ShouldApplyShortCacheForUnversionedAssets()
    {
        var options = WebApplicationPipelineExtensions.CreateStaticFileOptions();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = "/css/site.css";
        var responseContext = new StaticFileResponseContext(
            httpContext,
            new TestFileInfo("site.css"));

        options.OnPrepareResponse!(responseContext);

        Assert.Equal("public,max-age=300", httpContext.Response.Headers.CacheControl.ToString());
    }

    private sealed class TestAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }
    }

    private sealed class TestFileInfo : Microsoft.Extensions.FileProviders.IFileInfo
    {
        public TestFileInfo(string name)
        {
            Name = name;
        }

        public bool Exists => true;
        public long Length => 0;
        public string? PhysicalPath => null;
        public string Name { get; }
        public DateTimeOffset LastModified => DateTimeOffset.UtcNow;
        public bool IsDirectory => false;
        public Stream CreateReadStream() => Stream.Null;
    }
}
