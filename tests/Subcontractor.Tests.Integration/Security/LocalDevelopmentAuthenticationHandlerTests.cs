using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Web.Authentication;

namespace Subcontractor.Tests.Integration.Security;

public sealed class LocalDevelopmentAuthenticationHandlerTests
{
    [Fact]
    public async Task HandleAuthenticateAsync_ShouldUseFallbackValues_WhenConfigurationIsEmpty()
    {
        var result = await AuthenticateAsync(new Dictionary<string, string?>());

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Principal);
        Assert.Equal("local.admin", result.Principal.Identity?.Name);
        Assert.Equal("local.admin", GetClaim(result.Principal, ClaimTypes.NameIdentifier));
        Assert.Equal("local.admin@localhost", GetClaim(result.Principal, ClaimTypes.Email));
        Assert.Equal("local.admin", GetClaim(result.Principal, ClaimTypes.GivenName));
        Assert.Equal("local-development", GetClaim(result.Principal, "auth_source"));
        Assert.Equal(LocalDevelopmentAuthenticationHandler.SchemeName, result.Ticket?.AuthenticationScheme);
    }

    [Fact]
    public async Task HandleAuthenticateAsync_ShouldUseConfiguredValues_WhenConfigurationProvided()
    {
        var result = await AuthenticateAsync(new Dictionary<string, string?>
        {
            ["Security:LocalDevLogin"] = "demo.user",
            ["Security:LocalDevDisplayName"] = "Демо Пользователь",
            ["Security:LocalDevEmail"] = "demo.user@example.test"
        });

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Principal);
        Assert.Equal("demo.user", result.Principal.Identity?.Name);
        Assert.Equal("demo.user", GetClaim(result.Principal, ClaimTypes.NameIdentifier));
        Assert.Equal("demo.user@example.test", GetClaim(result.Principal, ClaimTypes.Email));
        Assert.Equal("Демо Пользователь", GetClaim(result.Principal, ClaimTypes.GivenName));
        Assert.Equal("local-development", GetClaim(result.Principal, "auth_source"));
        Assert.Equal(LocalDevelopmentAuthenticationHandler.SchemeName, result.Ticket?.AuthenticationScheme);
    }

    private static string? GetClaim(ClaimsPrincipal principal, string type)
    {
        return principal.FindFirst(type)?.Value;
    }

    private static async Task<AuthenticateResult> AuthenticateAsync(Dictionary<string, string?> configurationValues)
    {
        var services = new ServiceCollection();
        services.AddLogging();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configurationValues)
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddAuthentication(LocalDevelopmentAuthenticationHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, LocalDevelopmentAuthenticationHandler>(
                LocalDevelopmentAuthenticationHandler.SchemeName,
                _ => { });

        using var serviceProvider = services.BuildServiceProvider();
        var context = new DefaultHttpContext
        {
            RequestServices = serviceProvider
        };

        var authenticationService = serviceProvider.GetRequiredService<IAuthenticationService>();
        return await authenticationService.AuthenticateAsync(context, LocalDevelopmentAuthenticationHandler.SchemeName);
    }
}
