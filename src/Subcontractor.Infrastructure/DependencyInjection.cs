using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ContractorRatings;
using Subcontractor.Application.Sla;
using Subcontractor.Infrastructure.Configuration;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Infrastructure.Services;

namespace Subcontractor.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
                               ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.Configure<SecurityOptions>(configuration.GetSection(SecurityOptions.SectionName));
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.Configure<SlaMonitoringOptions>(configuration.GetSection(SlaMonitoringOptions.SectionName));
        services.Configure<ContractorRatingOptions>(configuration.GetSection(ContractorRatingOptions.SectionName));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPermissionEvaluator, PermissionEvaluator>();
        services.AddScoped<IUserProvisioningService, UserProvisioningService>();
        services.AddScoped<INotificationEmailSender, SmtpNotificationEmailSender>();
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        return services;
    }
}
