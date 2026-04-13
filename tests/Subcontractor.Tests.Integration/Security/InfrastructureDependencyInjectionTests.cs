using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Infrastructure;
using Subcontractor.Infrastructure.Configuration;
using Subcontractor.Infrastructure.Services;

namespace Subcontractor.Tests.Integration.Security;

public sealed class InfrastructureDependencyInjectionTests
{
    [Fact]
    public void AddInfrastructure_WithoutDefaultConnectionString_ShouldThrow()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([])
            .Build();

        var error = Assert.Throws<InvalidOperationException>(() => services.AddInfrastructure(configuration));

        Assert.Equal("Connection string 'DefaultConnection' is not configured.", error.Message);
    }

    [Fact]
    public void AddInfrastructure_WithConfiguration_ShouldRegisterCoreServices_AndBindOptions()
    {
        var services = new ServiceCollection();
        services.AddLogging();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=localhost,1433;Database=SubcontractorV2_Test;User Id=sa;Password=YourStr0ng!Passw0rd;TrustServerCertificate=True;Encrypt=False",
                ["Security:BootstrapAdminLogins:0"] = "local.admin",
                ["Smtp:Enabled"] = "true",
                ["Smtp:DryRun"] = "true",
                ["Smtp:Host"] = "smtp.local",
                ["Smtp:FromAddress"] = "noreply@local"
            })
            .Build();

        services.AddInfrastructure(configuration);

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var scoped = scope.ServiceProvider;

        var currentUser = scoped.GetRequiredService<ICurrentUserService>();
        var permissionEvaluator = scoped.GetRequiredService<IPermissionEvaluator>();
        var userProvisioning = scoped.GetRequiredService<IUserProvisioningService>();
        var emailSender = scoped.GetRequiredService<INotificationEmailSender>();
        var appDateTimeProvider = scoped.GetRequiredService<IDateTimeProvider>();

        Assert.IsType<CurrentUserService>(currentUser);
        Assert.IsType<PermissionEvaluator>(permissionEvaluator);
        Assert.IsType<UserProvisioningService>(userProvisioning);
        Assert.IsType<SmtpNotificationEmailSender>(emailSender);
        Assert.IsType<SystemDateTimeProvider>(appDateTimeProvider);

        var securityOptions = scoped.GetRequiredService<IOptions<SecurityOptions>>().Value;
        var smtpOptions = scoped.GetRequiredService<IOptions<SmtpOptions>>().Value;

        Assert.Contains("local.admin", securityOptions.BootstrapAdminLogins);
        Assert.True(smtpOptions.Enabled);
        Assert.True(smtpOptions.DryRun);
        Assert.Equal("smtp.local", smtpOptions.Host);
        Assert.Equal("noreply@local", smtpOptions.FromAddress);
    }
}
