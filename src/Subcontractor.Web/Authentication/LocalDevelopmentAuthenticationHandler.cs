using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Subcontractor.Web.Authentication;

public sealed class LocalDevelopmentAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "LocalDevelopment";

    private readonly IConfiguration _configuration;

    public LocalDevelopmentAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IConfiguration configuration)
        : base(options, logger, encoder)
    {
        _configuration = configuration;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var login = _configuration["Security:LocalDevLogin"];
        if (string.IsNullOrWhiteSpace(login))
        {
            login = "local.admin";
        }

        var displayName = _configuration["Security:LocalDevDisplayName"];
        if (string.IsNullOrWhiteSpace(displayName))
        {
            displayName = login;
        }

        var email = _configuration["Security:LocalDevEmail"];
        if (string.IsNullOrWhiteSpace(email))
        {
            email = $"{login}@localhost";
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, login),
            new(ClaimTypes.NameIdentifier, login),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.GivenName, displayName),
            new("auth_source", "local-development")
        };

        var identity = new ClaimsIdentity(claims, SchemeName, ClaimTypes.Name, ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
