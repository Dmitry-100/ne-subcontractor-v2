using Subcontractor.Application.Dashboard;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardPerformanceMetricsQueryServiceTests
{
    [Fact]
    public async Task BuildOverdueAsync_WithDataAndPermissions_ShouldReturnExpectedCounts()
    {
        var utcToday = new DateTime(2026, 4, 11);
        await using var db = TestDbContextFactory.Create("dashboard-overdue-metrics-user");

        var overdueProcedure = CreateProcedure(
            ProcurementProcedureStatus.OnApproval,
            utcToday.AddDays(-1),
            null);
        var futureProcedure = CreateProcedure(
            ProcurementProcedureStatus.OnApproval,
            utcToday.AddDays(2),
            null);
        var completedProcedure = CreateProcedure(
            ProcurementProcedureStatus.Completed,
            utcToday.AddDays(-3),
            utcToday.AddDays(-2));

        var activeContract = CreateContract("CTR-OVERDUE-ACTIVE", ContractStatus.Active, utcToday.AddDays(-1));
        var closedContract = CreateContract("CTR-OVERDUE-CLOSED", ContractStatus.Closed, utcToday.AddDays(-7));

        var activeOverdueMilestone = new ContractMilestone
        {
            ContractId = activeContract.Id,
            Title = "Overdue active",
            PlannedDate = utcToday.AddDays(-2),
            ProgressPercent = 35m,
            SortOrder = 0
        };
        var activeCompletedMilestone = new ContractMilestone
        {
            ContractId = activeContract.Id,
            Title = "Completed active",
            PlannedDate = utcToday.AddDays(-1),
            ProgressPercent = 100m,
            SortOrder = 1
        };
        var closedOverdueMilestone = new ContractMilestone
        {
            ContractId = closedContract.Id,
            Title = "Overdue closed",
            PlannedDate = utcToday.AddDays(-4),
            ProgressPercent = 20m,
            SortOrder = 0
        };

        await db.Set<ProcurementProcedure>().AddRangeAsync(overdueProcedure, futureProcedure, completedProcedure);
        await db.Set<Contract>().AddRangeAsync(activeContract, closedContract);
        await db.Set<ContractMilestone>().AddRangeAsync(
            activeOverdueMilestone,
            activeCompletedMilestone,
            closedOverdueMilestone);
        await db.SaveChangesAsync();

        var service = new DashboardPerformanceMetricsQueryService(db);
        var overdue = await service.BuildOverdueAsync(
            canReadProcedures: true,
            canReadContracts: true,
            utcToday: utcToday);

        Assert.Equal(1, overdue.ProceduresCount);
        Assert.Equal(1, overdue.ContractsCount);
        Assert.Equal(1, overdue.MilestonesCount);
    }

    [Fact]
    public async Task BuildKpiAsync_WithDataAndPermissions_ShouldReturnExpectedRates()
    {
        var utcToday = new DateTime(2026, 4, 11);
        await using var db = TestDbContextFactory.Create("dashboard-kpi-metrics-user");

        var signedContract = CreateContract("CTR-KPI-SIGNED", ContractStatus.Signed, utcToday.AddDays(10));
        var activeContract = CreateContract("CTR-KPI-ACTIVE", ContractStatus.Active, utcToday.AddDays(12));
        var closedContract = CreateContract("CTR-KPI-CLOSED", ContractStatus.Closed, utcToday.AddDays(-1));

        var signedMilestoneCompleted = new ContractMilestone
        {
            ContractId = signedContract.Id,
            Title = "Signed completed",
            PlannedDate = utcToday.AddDays(-2),
            ProgressPercent = 100m,
            SortOrder = 0
        };
        var activeMilestonePending = new ContractMilestone
        {
            ContractId = activeContract.Id,
            Title = "Active pending",
            PlannedDate = utcToday.AddDays(3),
            ProgressPercent = 50m,
            SortOrder = 0
        };
        var closedMilestoneIgnored = new ContractMilestone
        {
            ContractId = closedContract.Id,
            Title = "Closed ignored",
            PlannedDate = utcToday.AddDays(-3),
            ProgressPercent = 100m,
            SortOrder = 0
        };

        await db.Set<Contract>().AddRangeAsync(signedContract, activeContract, closedContract);
        await db.Set<ContractMilestone>().AddRangeAsync(
            signedMilestoneCompleted,
            activeMilestonePending,
            closedMilestoneIgnored);
        await db.SaveChangesAsync();

        var procedureCounts = new Dictionary<ProcurementProcedureStatus, int>
        {
            [ProcurementProcedureStatus.Completed] = 2,
            [ProcurementProcedureStatus.Created] = 2,
            [ProcurementProcedureStatus.Canceled] = 1
        };
        var contractCounts = new Dictionary<ContractStatus, int>
        {
            [ContractStatus.Signed] = 2,
            [ContractStatus.Active] = 1,
            [ContractStatus.Closed] = 1
        };

        var service = new DashboardPerformanceMetricsQueryService(db);
        var kpi = await service.BuildKpiAsync(
            canReadProcedures: true,
            canReadContracts: true,
            procedureCounts,
            contractCounts);

        Assert.Equal(50m, kpi.ProcedureCompletionRatePercent);
        Assert.Equal(25m, kpi.ContractClosureRatePercent);
        Assert.Equal(50m, kpi.MilestoneCompletionRatePercent);
    }

    private static ProcurementProcedure CreateProcedure(
        ProcurementProcedureStatus status,
        DateTime? proposalDueDate,
        DateTime? requiredSubcontractorDeadline)
    {
        return new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            Status = status,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = $"Procedure-{Guid.NewGuid():N}".Substring(0, 14),
            WorkScope = "Scope",
            CustomerName = "Customer",
            LeadOfficeCode = "LEAD",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5",
            ProposalDueDate = proposalDueDate,
            RequiredSubcontractorDeadline = requiredSubcontractorDeadline
        };
    }

    private static Contract CreateContract(string number, ContractStatus status, DateTime? endDate)
    {
        return new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = number,
            SigningDate = DateTime.UtcNow.Date.AddDays(-20),
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = DateTime.UtcNow.Date.AddDays(-15),
            EndDate = endDate,
            Status = status
        };
    }
}
