using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics;
using Subcontractor.Application.Analytics.Models;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Analytics;

public sealed class AnalyticsControllerTests
{
    [Fact]
    public async Task GetKpiDashboard_ShouldReturnOk()
    {
        await using var db = TestDbContextFactory.Create("analytics-user");
        var controller = CreateController(db);

        var result = await controller.GetKpiDashboard(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<AnalyticsKpiDashboardDto>(ok.Value);
        Assert.True(payload.GeneratedAtUtc > DateTimeOffset.MinValue);
    }

    [Fact]
    public async Task GetViewCatalog_ShouldReturnKnownViews()
    {
        await using var db = TestDbContextFactory.Create("analytics-user");
        var controller = CreateController(db);

        var result = await controller.GetViewCatalog(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<AnalyticsViewDescriptorDto>>(ok.Value);
        Assert.Contains(payload, x => x.ViewName == "vwAnalytics_LotFunnel");
    }

    private static AnalyticsController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var service = new AnalyticsService(
            db,
            new FixedDateTimeProvider(new DateTimeOffset(2026, 12, 20, 10, 0, 0, TimeSpan.Zero)));

        return new AnalyticsController(service);
    }

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        public FixedDateTimeProvider(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }
}
