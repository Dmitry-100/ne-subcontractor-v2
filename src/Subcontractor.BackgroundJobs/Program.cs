using Subcontractor.BackgroundJobs.Configuration;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSubcontractorBackgroundJobsComposition(builder.Configuration);

var host = builder.Build();
await host.RunAsync();
