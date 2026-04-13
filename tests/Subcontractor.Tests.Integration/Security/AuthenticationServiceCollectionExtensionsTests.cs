using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Subcontractor.Web.Authentication;
using Subcontractor.Web.Configuration;

namespace Subcontractor.Tests.Integration.Security;

public sealed class AuthenticationServiceCollectionExtensionsTests
{
    [Fact]
    public async Task AddSubcontractorAuthentication_ShouldRegisterLocalDevelopmentScheme_ForDevelopmentEnvironment()
    {
        var services = new ServiceCollection();
        services.AddSubcontractorAuthentication(new TestHostEnvironment(Environments.Development));

        using var provider = services.BuildServiceProvider();
        var authenticationOptions = provider.GetRequiredService<IOptions<AuthenticationOptions>>().Value;
        var schemeProvider = provider.GetRequiredService<IAuthenticationSchemeProvider>();

        Assert.Equal(LocalDevelopmentAuthenticationHandler.SchemeName, authenticationOptions.DefaultScheme);

        var localScheme = await schemeProvider.GetSchemeAsync(LocalDevelopmentAuthenticationHandler.SchemeName);
        Assert.NotNull(localScheme);
        Assert.Equal(typeof(LocalDevelopmentAuthenticationHandler), localScheme.HandlerType);

        var negotiateScheme = await schemeProvider.GetSchemeAsync(NegotiateDefaults.AuthenticationScheme);
        Assert.Null(negotiateScheme);
    }

    [Fact]
    public async Task AddSubcontractorAuthentication_ShouldRegisterNegotiateScheme_ForNonDevelopmentEnvironment()
    {
        var services = new ServiceCollection();
        services.AddSubcontractorAuthentication(new TestHostEnvironment(Environments.Production));

        using var provider = services.BuildServiceProvider();
        var authenticationOptions = provider.GetRequiredService<IOptions<AuthenticationOptions>>().Value;
        var schemeProvider = provider.GetRequiredService<IAuthenticationSchemeProvider>();

        Assert.Equal(NegotiateDefaults.AuthenticationScheme, authenticationOptions.DefaultScheme);

        var negotiateScheme = await schemeProvider.GetSchemeAsync(NegotiateDefaults.AuthenticationScheme);
        Assert.NotNull(negotiateScheme);
        Assert.NotNull(negotiateScheme.HandlerType);

        var localScheme = await schemeProvider.GetSchemeAsync(LocalDevelopmentAuthenticationHandler.SchemeName);
        Assert.Null(localScheme);
    }

    [Fact]
    public void AddSubcontractorAuthentication_ShouldThrow_WhenEnvironmentIsNull()
    {
        var services = new ServiceCollection();

        var error = Assert.Throws<ArgumentNullException>(() => services.AddSubcontractorAuthentication(null!));

        Assert.Equal("environment", error.ParamName);
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public TestHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "Subcontractor.Tests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
