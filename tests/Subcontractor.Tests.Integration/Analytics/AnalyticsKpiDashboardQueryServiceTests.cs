using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Analytics;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Analytics;

public sealed class AnalyticsKpiDashboardQueryServiceTests
{
    [Fact]
    public async Task GetKpiDashboardAsync_EmptyDataSet_ShouldReturnZeroedMetrics()
    {
        await using var db = TestDbContextFactory.Create("analytics-kpi-user");
        var now = new DateTimeOffset(2026, 12, 20, 10, 0, 0, TimeSpan.Zero);
        var service = new AnalyticsKpiDashboardQueryService(db, new FixedDateTimeProvider(now));

        var result = await service.GetKpiDashboardAsync();

        Assert.Equal(now, result.GeneratedAtUtc);
        Assert.True(result.LotFunnel.All(x => x.Count == 0));
        Assert.Equal(0, result.ContractorLoad.ActiveContractors);
        Assert.Equal(0, result.Sla.OpenWarnings);
        Assert.Equal(0m, result.ContractingAmounts.SignedAndActiveTotalAmount);
        Assert.Equal(0, result.MdrProgress.RowsTotal);
        Assert.Equal(0m, result.SubcontractingShare.TotalPlannedManHours);
        Assert.Empty(result.TopContractors);
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
