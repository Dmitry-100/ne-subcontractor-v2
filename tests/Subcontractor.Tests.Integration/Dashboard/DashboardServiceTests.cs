using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Dashboard;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardServiceTests
{
    [Fact]
    public async Task GetSummaryAsync_WithScopedUser_ShouldReturnCountersOverdueKpiAndTasks()
    {
        var now = new DateTimeOffset(2026, 04, 06, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create("dash.user");

        var role = CreateRole(
            "DASH_ROLE",
            PermissionCodes.ProjectsRead,
            PermissionCodes.LotsRead,
            PermissionCodes.ProceduresRead,
            PermissionCodes.ProceduresTransition,
            PermissionCodes.ContractsRead,
            PermissionCodes.ContractsUpdate);
        var user = CreateUser("dash.user");
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = role
        });

        var ownProject = new Project
        {
            Code = "PRJ-OWN",
            Name = "Own Project",
            GipUserId = user.Id
        };
        var foreignProject = new Project
        {
            Code = "PRJ-FOREIGN",
            Name = "Foreign Project",
            GipUserId = Guid.NewGuid()
        };

        var lotDraft = new Lot
        {
            Code = "LOT-001",
            Name = "Lot Draft",
            Status = LotStatus.Draft
        };
        var lotInProc = new Lot
        {
            Code = "LOT-002",
            Name = "Lot In Procurement",
            Status = LotStatus.InProcurement
        };

        var actionableProcedure = CreateProcedure(
            lotDraft.Id,
            ProcurementProcedureStatus.OnApproval,
            now.UtcDateTime.Date.AddDays(-1),
            null);
        var blockedProcedure = CreateProcedure(
            lotInProc.Id,
            ProcurementProcedureStatus.OnApproval,
            now.UtcDateTime.Date.AddDays(2),
            null);
        var completedProcedure = CreateProcedure(
            Guid.NewGuid(),
            ProcurementProcedureStatus.Completed,
            now.UtcDateTime.Date.AddDays(-3),
            now.UtcDateTime.Date.AddDays(-3));

        var actionableStep = new ProcedureApprovalStep
        {
            ProcedureId = actionableProcedure.Id,
            StepOrder = 1,
            StepTitle = "Approve package",
            ApproverRoleName = role.Name,
            IsRequired = true,
            Status = ProcedureApprovalStepStatus.Pending
        };

        var blockedPreviousStep = new ProcedureApprovalStep
        {
            ProcedureId = blockedProcedure.Id,
            StepOrder = 1,
            StepTitle = "Other role first",
            ApproverRoleName = "OTHER_ROLE",
            IsRequired = true,
            Status = ProcedureApprovalStepStatus.Pending
        };
        var blockedCurrentUserStep = new ProcedureApprovalStep
        {
            ProcedureId = blockedProcedure.Id,
            StepOrder = 2,
            StepTitle = "Current user second",
            ApproverRoleName = role.Name,
            IsRequired = true,
            Status = ProcedureApprovalStepStatus.Pending
        };

        var activeContract = CreateContract("CTR-ACTIVE", ContractStatus.Active, now.UtcDateTime.Date.AddDays(-1));
        var closedContract = CreateContract("CTR-CLOSED", ContractStatus.Closed, now.UtcDateTime.Date.AddDays(-10));

        var overdueMilestone = new ContractMilestone
        {
            ContractId = activeContract.Id,
            Title = "Overdue milestone",
            PlannedDate = now.UtcDateTime.Date.AddDays(-4),
            ProgressPercent = 40m,
            SortOrder = 0
        };
        var completedMilestone = new ContractMilestone
        {
            ContractId = activeContract.Id,
            Title = "Completed milestone",
            PlannedDate = now.UtcDateTime.Date.AddDays(-2),
            ActualDate = now.UtcDateTime.Date.AddDays(-1),
            ProgressPercent = 100m,
            SortOrder = 1
        };

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);
        await db.Set<Project>().AddRangeAsync(ownProject, foreignProject);
        await db.Set<Lot>().AddRangeAsync(lotDraft, lotInProc);
        await db.Set<ProcurementProcedure>().AddRangeAsync(actionableProcedure, blockedProcedure, completedProcedure);
        await db.Set<ProcedureApprovalStep>().AddRangeAsync(actionableStep, blockedPreviousStep, blockedCurrentUserStep);
        await db.Set<Contract>().AddRangeAsync(activeContract, closedContract);
        await db.Set<ContractMilestone>().AddRangeAsync(overdueMilestone, completedMilestone);
        await db.SaveChangesAsync();

        var service = new DashboardService(db, new TestCurrentUserService("dash.user"), new FixedDateTimeProvider(now));
        var summary = await service.GetSummaryAsync();

        Assert.Equal(1, summary.Counters.ProjectsTotal);
        Assert.Equal(2, summary.Counters.LotsTotal);
        Assert.Equal(3, summary.Counters.ProceduresTotal);
        Assert.Equal(2, summary.Counters.ContractsTotal);

        Assert.Equal(1, summary.Overdue.ProceduresCount);
        Assert.Equal(1, summary.Overdue.ContractsCount);
        Assert.Equal(1, summary.Overdue.MilestonesCount);

        Assert.Equal(33.33m, summary.Kpi.ProcedureCompletionRatePercent);
        Assert.Equal(50m, summary.Kpi.ContractClosureRatePercent);
        Assert.Equal(50m, summary.Kpi.MilestoneCompletionRatePercent);
        Assert.Equal(0, summary.ImportPipeline.SourceUploadedCount);
        Assert.Equal(0, summary.ImportPipeline.XmlReceivedCount);
        Assert.Equal(0, summary.ImportPipeline.TraceAppliedGroupsCount);
        Assert.Equal(0, summary.ImportPipeline.TraceCreatedGroupsCount);
        Assert.Equal(0, summary.ImportPipeline.TraceSkippedGroupsCount);
        Assert.Equal(0, summary.ImportPipeline.TraceCreatedLotsCount);

        Assert.Contains(summary.MyTasks, x => x.Module == "Procedures");
        Assert.Contains(summary.MyTasks, x => x.Module == "Contracts");
        Assert.DoesNotContain(summary.MyTasks, x => x.Description.Contains("Current user second", StringComparison.OrdinalIgnoreCase));

        var procedureTask = Assert.Single(summary.MyTasks.Where(x => x.Module == "Procedures"));
        Assert.StartsWith("/Home/Procedures?", procedureTask.ActionUrl, StringComparison.Ordinal);
        Assert.Contains("status=OnApproval", procedureTask.ActionUrl, StringComparison.Ordinal);
        Assert.Contains("search=", procedureTask.ActionUrl, StringComparison.Ordinal);

        var contractTask = Assert.Single(summary.MyTasks.Where(x => x.Module == "Contracts"));
        Assert.StartsWith("/Home/Contracts?", contractTask.ActionUrl, StringComparison.Ordinal);
        Assert.Contains("status=Signed,Active", contractTask.ActionUrl, StringComparison.Ordinal);
        Assert.Contains("search=", contractTask.ActionUrl, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetSummaryAsync_WithImportsReadPermission_ShouldReturnImportPipelineMetrics()
    {
        var now = new DateTimeOffset(2026, 04, 06, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create("imports.user");

        var role = CreateRole("IMPORTS_ROLE", PermissionCodes.ImportsRead);
        var user = CreateUser("imports.user");
        user.Roles.Add(new AppUserRole
        {
            AppUser = user,
            AppRole = role
        });

        var sourceUploaded = new SourceDataImportBatch
        {
            FileName = "uploaded.csv",
            Status = SourceDataImportBatchStatus.Uploaded,
            TotalRows = 10,
            ValidRows = 10,
            InvalidRows = 0
        };
        var sourceProcessing = new SourceDataImportBatch
        {
            FileName = "processing.csv",
            Status = SourceDataImportBatchStatus.Processing,
            TotalRows = 20,
            ValidRows = 20,
            InvalidRows = 0
        };
        var sourceReady = new SourceDataImportBatch
        {
            FileName = "ready.csv",
            Status = SourceDataImportBatchStatus.ReadyForLotting,
            TotalRows = 30,
            ValidRows = 30,
            InvalidRows = 0
        };
        var sourceWithErrors = new SourceDataImportBatch
        {
            FileName = "errors.csv",
            Status = SourceDataImportBatchStatus.ValidatedWithErrors,
            TotalRows = 10,
            ValidRows = 7,
            InvalidRows = 3
        };
        var sourceFailed = new SourceDataImportBatch
        {
            FileName = "failed.csv",
            Status = SourceDataImportBatchStatus.Failed,
            TotalRows = 10,
            ValidRows = 8,
            InvalidRows = 2
        };
        var sourceRejected = new SourceDataImportBatch
        {
            FileName = "rejected.csv",
            Status = SourceDataImportBatchStatus.Rejected,
            TotalRows = 10,
            ValidRows = 6,
            InvalidRows = 4
        };

        var xmlReceived = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "received.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Received
        };
        var xmlProcessing = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "processing.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Processing
        };
        var xmlCompleted = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "completed.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Completed,
            ProcessedAtUtc = now.UtcDateTime
        };
        var xmlFailed = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "failed.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Failed,
            ErrorMessage = "Failed to parse XML.",
            ProcessedAtUtc = now.UtcDateTime
        };
        var xmlRetriedPending = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            FileName = "retry.xml",
            XmlContent = "<rows/>",
            Status = XmlSourceDataImportInboxStatus.Received
        };
        var traceLotA = new Lot
        {
            Code = "LOT-TRACE-001",
            Name = "Trace lot 1",
            Status = LotStatus.Draft
        };
        var traceLotB = new Lot
        {
            Code = "LOT-TRACE-002",
            Name = "Trace lot 2",
            Status = LotStatus.Draft
        };
        var traceApplyOperationA = Guid.NewGuid();
        var traceApplyOperationB = Guid.NewGuid();
        var traceCreatedA = new SourceDataLotReconciliationRecord
        {
            SourceDataImportBatch = sourceReady,
            ApplyOperationId = traceApplyOperationA,
            RecommendationGroupKey = "PRJ-READY|PIPING",
            ProjectCode = "PRJ-READY",
            DisciplineCode = "PIPING",
            RequestedLotCode = traceLotA.Code,
            RequestedLotName = traceLotA.Name,
            SourceRowsCount = 12,
            TotalManHours = 240m,
            PlannedStartDate = now.UtcDateTime.Date,
            PlannedFinishDate = now.UtcDateTime.Date.AddDays(7),
            IsCreated = true,
            Lot = traceLotA
        };
        var traceCreatedB = new SourceDataLotReconciliationRecord
        {
            SourceDataImportBatch = sourceReady,
            ApplyOperationId = traceApplyOperationA,
            RecommendationGroupKey = "PRJ-READY|ELEC",
            ProjectCode = "PRJ-READY",
            DisciplineCode = "ELEC",
            RequestedLotCode = traceLotB.Code,
            RequestedLotName = traceLotB.Name,
            SourceRowsCount = 8,
            TotalManHours = 150m,
            PlannedStartDate = now.UtcDateTime.Date.AddDays(1),
            PlannedFinishDate = now.UtcDateTime.Date.AddDays(9),
            IsCreated = true,
            Lot = traceLotB
        };
        var traceSkipped = new SourceDataLotReconciliationRecord
        {
            SourceDataImportBatch = sourceWithErrors,
            ApplyOperationId = traceApplyOperationB,
            RecommendationGroupKey = "PRJ-ERR|PIPING",
            ProjectCode = "PRJ-ERR",
            DisciplineCode = "PIPING",
            RequestedLotCode = "LOT-ERR-001",
            RequestedLotName = "Skipped lot",
            SourceRowsCount = 3,
            TotalManHours = 42m,
            IsCreated = false,
            SkipReason = "Lot code already exists."
        };

        await db.Set<AppRole>().AddAsync(role);
        await db.Set<AppUser>().AddAsync(user);
        await db.Set<Lot>().AddRangeAsync(traceLotA, traceLotB);
        await db.Set<SourceDataImportBatch>().AddRangeAsync(
            sourceUploaded,
            sourceProcessing,
            sourceReady,
            sourceWithErrors,
            sourceFailed,
            sourceRejected);
        await db.Set<XmlSourceDataImportInboxItem>().AddRangeAsync(
            xmlReceived,
            xmlProcessing,
            xmlCompleted,
            xmlFailed,
            xmlRetriedPending);
        await db.Set<SourceDataLotReconciliationRecord>().AddRangeAsync(
            traceCreatedA,
            traceCreatedB,
            traceSkipped);
        await db.SaveChangesAsync();

        // Emulate "retried and waiting in queue": item is still Received but already modified after initial insert.
        xmlRetriedPending.ExternalDocumentId = "retry-001";
        await db.SaveChangesAsync();

        var service = new DashboardService(db, new TestCurrentUserService("imports.user"), new FixedDateTimeProvider(now));
        var summary = await service.GetSummaryAsync();

        Assert.Equal(1, summary.ImportPipeline.SourceUploadedCount);
        Assert.Equal(1, summary.ImportPipeline.SourceProcessingCount);
        Assert.Equal(1, summary.ImportPipeline.SourceReadyForLottingCount);
        Assert.Equal(1, summary.ImportPipeline.SourceValidatedWithErrorsCount);
        Assert.Equal(1, summary.ImportPipeline.SourceFailedCount);
        Assert.Equal(1, summary.ImportPipeline.SourceRejectedCount);
        Assert.Equal(9, summary.ImportPipeline.SourceInvalidRowsCount);
        Assert.Equal(2, summary.ImportPipeline.XmlReceivedCount);
        Assert.Equal(1, summary.ImportPipeline.XmlProcessingCount);
        Assert.Equal(1, summary.ImportPipeline.XmlCompletedCount);
        Assert.Equal(1, summary.ImportPipeline.XmlFailedCount);
        Assert.Equal(1, summary.ImportPipeline.XmlRetriedPendingCount);
        Assert.Equal(3, summary.ImportPipeline.TraceAppliedGroupsCount);
        Assert.Equal(2, summary.ImportPipeline.TraceCreatedGroupsCount);
        Assert.Equal(1, summary.ImportPipeline.TraceSkippedGroupsCount);
        Assert.Equal(2, summary.ImportPipeline.TraceCreatedLotsCount);
    }

    [Fact]
    public async Task GetSummaryAsync_WhenCurrentUserIsUnknown_ShouldReturnEmptySummary()
    {
        var now = new DateTimeOffset(2026, 04, 06, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create("unknown.user");

        var service = new DashboardService(db, new TestCurrentUserService("unknown.user"), new FixedDateTimeProvider(now));
        var summary = await service.GetSummaryAsync();

        Assert.Equal(0, summary.Counters.ProjectsTotal);
        Assert.Equal(0, summary.Counters.LotsTotal);
        Assert.Equal(0, summary.Counters.ProceduresTotal);
        Assert.Equal(0, summary.Counters.ContractsTotal);
        Assert.Equal(0, summary.ImportPipeline.SourceUploadedCount);
        Assert.Equal(0, summary.ImportPipeline.XmlReceivedCount);
        Assert.Equal(0, summary.ImportPipeline.TraceAppliedGroupsCount);
        Assert.Equal(0, summary.ImportPipeline.TraceCreatedGroupsCount);
        Assert.Equal(0, summary.ImportPipeline.TraceSkippedGroupsCount);
        Assert.Equal(0, summary.ImportPipeline.TraceCreatedLotsCount);
        Assert.Empty(summary.MyTasks);
    }

    private static AppRole CreateRole(string roleName, params string[] permissionCodes)
    {
        var role = new AppRole
        {
            Name = roleName,
            Description = "Dashboard role"
        };

        foreach (var permissionCode in permissionCodes)
        {
            role.Permissions.Add(new RolePermission
            {
                AppRole = role,
                PermissionCode = permissionCode
            });
        }

        return role;
    }

    private static AppUser CreateUser(string login)
    {
        return new AppUser
        {
            ExternalId = $"ext-{login}",
            Login = login,
            DisplayName = login,
            Email = $"{login}@example.com",
            IsActive = true
        };
    }

    private static ProcurementProcedure CreateProcedure(
        Guid lotId,
        ProcurementProcedureStatus status,
        DateTime? proposalDueDate,
        DateTime? requiredSubcontractorDeadline)
    {
        return new ProcurementProcedure
        {
            LotId = lotId,
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

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        public FixedDateTimeProvider(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }
}
