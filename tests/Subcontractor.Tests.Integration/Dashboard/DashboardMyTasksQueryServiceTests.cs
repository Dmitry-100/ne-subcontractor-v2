using Subcontractor.Application.Dashboard;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardMyTasksQueryServiceTests
{
    [Fact]
    public async Task BuildAsync_WithTaskSourcesDisabled_ShouldReturnEmptyTasks()
    {
        await using var db = TestDbContextFactory.Create("dashboard-my-tasks-disabled");
        var service = new DashboardMyTasksQueryService(db);

        var tasks = await service.BuildAsync(
            Guid.NewGuid(),
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "DASH_ROLE" },
            includeProcedureTasks: false,
            includeMilestoneTasks: false,
            utcToday: new DateTime(2026, 4, 11));

        Assert.Empty(tasks);
    }

    [Fact]
    public async Task BuildAsync_WithPendingApprovalsAndOverdueMilestones_ShouldReturnOrderedTasks()
    {
        var utcToday = new DateTime(2026, 4, 11);
        await using var db = TestDbContextFactory.Create("dashboard-my-tasks-user");

        var activeContract = CreateContract("CTR-ACTIVE", ContractStatus.Active, utcToday.AddDays(20));
        var overdueMilestone = new ContractMilestone
        {
            ContractId = activeContract.Id,
            Title = "Milestone A",
            PlannedDate = utcToday.AddDays(-2),
            ProgressPercent = 40m,
            SortOrder = 0
        };

        var actionableProcedure = CreateProcedure(
            ProcurementProcedureStatus.OnApproval,
            "Scenario OnApproval",
            utcToday.AddDays(1),
            null);
        var blockedProcedure = CreateProcedure(
            ProcurementProcedureStatus.OnApproval,
            "Scenario Blocked",
            utcToday.AddDays(2),
            null);

        var actionableStep = new ProcedureApprovalStep
        {
            ProcedureId = actionableProcedure.Id,
            StepOrder = 1,
            StepTitle = "Коммерческий контроль",
            ApproverRoleName = "DASH_ROLE",
            IsRequired = true,
            Status = ProcedureApprovalStepStatus.Pending
        };

        var blockedPreviousStep = new ProcedureApprovalStep
        {
            ProcedureId = blockedProcedure.Id,
            StepOrder = 1,
            StepTitle = "Предыдущий шаг",
            ApproverRoleName = "OTHER_ROLE",
            IsRequired = true,
            Status = ProcedureApprovalStepStatus.Pending
        };
        var blockedCurrentStep = new ProcedureApprovalStep
        {
            ProcedureId = blockedProcedure.Id,
            StepOrder = 2,
            StepTitle = "Текущий шаг",
            ApproverRoleName = "DASH_ROLE",
            IsRequired = true,
            Status = ProcedureApprovalStepStatus.Pending
        };

        await db.Set<Contract>().AddAsync(activeContract);
        await db.Set<ContractMilestone>().AddAsync(overdueMilestone);
        await db.Set<ProcurementProcedure>().AddRangeAsync(actionableProcedure, blockedProcedure);
        await db.Set<ProcedureApprovalStep>().AddRangeAsync(actionableStep, blockedPreviousStep, blockedCurrentStep);
        await db.SaveChangesAsync();

        var service = new DashboardMyTasksQueryService(db);
        var tasks = await service.BuildAsync(
            Guid.NewGuid(),
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "DASH_ROLE" },
            includeProcedureTasks: true,
            includeMilestoneTasks: true,
            utcToday: utcToday);

        Assert.Equal(2, tasks.Count);
        Assert.Equal("Contracts", tasks[0].Module);
        Assert.Equal("High", tasks[0].Priority);
        Assert.StartsWith("/Home/Contracts?", tasks[0].ActionUrl, StringComparison.Ordinal);
        Assert.Contains("status=Signed,Active", tasks[0].ActionUrl, StringComparison.Ordinal);

        Assert.Equal("Procedures", tasks[1].Module);
        Assert.Contains("Коммерческий контроль", tasks[1].Description, StringComparison.Ordinal);
        Assert.Equal("Medium", tasks[1].Priority);
        Assert.StartsWith("/Home/Procedures?", tasks[1].ActionUrl, StringComparison.Ordinal);
        Assert.Contains("status=OnApproval", tasks[1].ActionUrl, StringComparison.Ordinal);
        Assert.DoesNotContain(tasks, x => x.Description.Contains("Текущий шаг", StringComparison.OrdinalIgnoreCase));
    }

    private static ProcurementProcedure CreateProcedure(
        ProcurementProcedureStatus status,
        string objectName,
        DateTime? proposalDueDate,
        DateTime? requiredSubcontractorDeadline)
    {
        return new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            Status = status,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = objectName,
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
