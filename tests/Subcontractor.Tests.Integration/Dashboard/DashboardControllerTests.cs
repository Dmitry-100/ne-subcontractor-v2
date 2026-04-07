using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard;
using Subcontractor.Application.Dashboard.Models;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardControllerTests
{
    [Fact]
    public async Task GetSummary_ShouldReturnOkPayload()
    {
        var now = new DateTimeOffset(2026, 04, 06, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create("unknown.user");

        var service = new DashboardService(db, new TestCurrentUserService("unknown.user"), new FixedDateTimeProvider(now));
        var controller = new DashboardController(service);

        var result = await controller.GetSummary(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<DashboardSummaryDto>(ok.Value);
        Assert.Equal(0, payload.Counters.ContractsTotal);
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
