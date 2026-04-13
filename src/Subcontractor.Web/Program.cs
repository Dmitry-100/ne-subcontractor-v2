using Subcontractor.Application;
using Subcontractor.Infrastructure;
using Subcontractor.Web.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSubcontractorAuthentication(builder.Environment);
builder.Services.AddSubcontractorAuthorization();
builder.Services.AddSubcontractorWebComposition(builder.Configuration);

var app = builder.Build();
app.UseSubcontractorPipeline();

app.Run();

public partial class Program;
