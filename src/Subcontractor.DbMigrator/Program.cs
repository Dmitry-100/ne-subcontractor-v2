using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Subcontractor.Application;
using Subcontractor.DbMigrator;
using Subcontractor.Infrastructure;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Infrastructure.Persistence.SeedData;

MigratorExecutionOptions options;
try
{
    options = MigratorExecutionOptions.Parse(args);
}
catch (ArgumentException ex)
{
    Console.Error.WriteLine(ex.Message);
    Console.Error.WriteLine("Use '--help' to see available options.");
    Environment.ExitCode = 1;
    return;
}

if (options.ShowHelp)
{
    Console.WriteLine(
        """
        Subcontractor.DbMigrator options:
          --dry-run    Run migrator entrypoint without DB operations (CI smoke mode).
          --skip-seed  Apply EF migrations, but skip default roles/permissions seed.
          --help       Show this help.

        Connection string source:
          ConnectionStrings:DefaultConnection (appsettings or env var ConnectionStrings__DefaultConnection)
        """);
    return;
}

if (options.DryRun)
{
    Console.WriteLine("DbMigrator dry-run completed. No database operation was executed.");
    return;
}

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

using var scope = app.Services.CreateScope();
var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

await dbContext.Database.MigrateAsync();

if (!options.SkipSeed)
{
    await DefaultRolesAndPermissionsSeeder.SeedAsync(dbContext);
}

Console.WriteLine("Database migrations applied successfully.");
