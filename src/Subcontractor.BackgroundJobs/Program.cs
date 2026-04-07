using Subcontractor.Application;
using Subcontractor.BackgroundJobs.Workers;
using Subcontractor.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHostedService<SlaMonitorWorker>();
builder.Services.AddHostedService<ContractorRatingRecalculationWorker>();

var host = builder.Build();
await host.RunAsync();
