using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Localization;
using System.Globalization;
using System.Text.Json.Serialization;
using Subcontractor.Application;
using Subcontractor.Domain.Users;
using Subcontractor.Infrastructure;
using Subcontractor.Web.Authentication;
using Subcontractor.Web.Authorization;
using Subcontractor.Web.Middleware;
using Subcontractor.Web.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddLocalization(options =>
{
    options.ResourcesPath = "Resources";
});

// Placeholder baseline for enterprise SSO. Adjust after AD/LDAP infra confirmation.
if (builder.Environment.IsDevelopment())
{
    builder.Services
        .AddAuthentication(LocalDevelopmentAuthenticationHandler.SchemeName)
        .AddScheme<AuthenticationSchemeOptions, LocalDevelopmentAuthenticationHandler>(
            LocalDevelopmentAuthenticationHandler.SchemeName,
            _ => { });
}
else
{
    builder.Services
        .AddAuthentication(NegotiateDefaults.AuthenticationScheme)
        .AddNegotiate();
}

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(PolicyCodes.ProjectsRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProjectsRead)));
    options.AddPolicy(PolicyCodes.ProjectsCreate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProjectsCreate)));
    options.AddPolicy(PolicyCodes.ProjectsUpdate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProjectsUpdate)));
    options.AddPolicy(PolicyCodes.ProjectsDelete, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProjectsDelete)));

    options.AddPolicy(PolicyCodes.ContractorsRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractorsRead)));
    options.AddPolicy(PolicyCodes.ContractorsCreate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractorsCreate)));
    options.AddPolicy(PolicyCodes.ContractorsUpdate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractorsUpdate)));
    options.AddPolicy(PolicyCodes.ContractorsDelete, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractorsDelete)));

    options.AddPolicy(PolicyCodes.ContractsRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractsRead)));
    options.AddPolicy(PolicyCodes.ContractsCreate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractsCreate)));
    options.AddPolicy(PolicyCodes.ContractsUpdate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractsUpdate)));
    options.AddPolicy(PolicyCodes.ContractsDelete, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ContractsDelete)));

    options.AddPolicy(PolicyCodes.LotsRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.LotsRead)));
    options.AddPolicy(PolicyCodes.LotsCreate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.LotsCreate)));
    options.AddPolicy(PolicyCodes.LotsUpdate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.LotsUpdate)));
    options.AddPolicy(PolicyCodes.LotsDelete, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.LotsDelete)));
    options.AddPolicy(PolicyCodes.LotsTransition, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.LotsTransition)));

    options.AddPolicy(PolicyCodes.ProceduresRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProceduresRead)));
    options.AddPolicy(PolicyCodes.ProceduresCreate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProceduresCreate)));
    options.AddPolicy(PolicyCodes.ProceduresUpdate, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProceduresUpdate)));
    options.AddPolicy(PolicyCodes.ProceduresDelete, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProceduresDelete)));
    options.AddPolicy(PolicyCodes.ProceduresTransition, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ProceduresTransition)));

    options.AddPolicy(PolicyCodes.ReferenceDataRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ReferenceDataRead)));
    options.AddPolicy(PolicyCodes.ReferenceDataWrite, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ReferenceDataWrite)));

    options.AddPolicy(PolicyCodes.UsersRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.UsersRead)));
    options.AddPolicy(PolicyCodes.UsersWrite, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.UsersWrite)));

    options.AddPolicy(PolicyCodes.ImportsRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ImportsRead)));
    options.AddPolicy(PolicyCodes.ImportsWrite, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.ImportsWrite)));

    options.AddPolicy(PolicyCodes.SlaRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.SlaRead)));
    options.AddPolicy(PolicyCodes.SlaWrite, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.SlaWrite)));

    options.AddPolicy(PolicyCodes.AnalyticsRead, policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(PermissionCodes.AnalyticsRead)));
});
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services
    .AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddHostedService<SourceDataImportProcessingWorker>();
builder.Services.AddHostedService<SlaMonitoringWorker>();
builder.Services.AddHostedService<ContractorRatingWorker>();

var app = builder.Build();

var supportedCultures = new[]
{
    new CultureInfo("ru-RU"),
    new CultureInfo("en-US")
};

app.UseRequestLocalization(new RequestLocalizationOptions
{
    DefaultRequestCulture = new RequestCulture("ru-RU"),
    SupportedCultures = supportedCultures,
    SupportedUICultures = supportedCultures
});

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseMiddleware<CurrentUserProvisioningMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

public partial class Program;
