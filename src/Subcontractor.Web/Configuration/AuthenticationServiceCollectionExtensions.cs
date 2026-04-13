using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Subcontractor.Web.Authentication;

namespace Subcontractor.Web.Configuration;

public static class AuthenticationServiceCollectionExtensions
{
    public static IServiceCollection AddSubcontractorAuthentication(
        this IServiceCollection services,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(environment);

        if (environment.IsDevelopment())
        {
            services
                .AddAuthentication(LocalDevelopmentAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, LocalDevelopmentAuthenticationHandler>(
                    LocalDevelopmentAuthenticationHandler.SchemeName,
                    _ => { });

            return services;
        }

        services
            .AddAuthentication(NegotiateDefaults.AuthenticationScheme)
            .AddNegotiate();

        return services;
    }
}
