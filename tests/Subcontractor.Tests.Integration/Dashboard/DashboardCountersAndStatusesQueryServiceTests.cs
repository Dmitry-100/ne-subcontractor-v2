using Subcontractor.Application.Dashboard;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Projects;
using Subcontractor.Infrastructure.Persistence;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Dashboard;

public sealed class DashboardCountersAndStatusesQueryServiceTests
{
    [Fact]
    public async Task BuildAsync_WithoutPermissions_ShouldReturnZeroCountersAndEmptyStatuses()
    {
        await using var db = TestDbContextFactory.Create("dashboard-counters-no-permissions");
        await SeedCoreDataAsync(db, Guid.NewGuid());

        var service = new DashboardCountersAndStatusesQueryService(db);
        var userContext = new DashboardUserContext(
            Guid.NewGuid(),
            new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            HasProjectsGlobalRead: false);

        var result = await service.BuildAsync(
            userContext,
            canReadProjects: false,
            canReadLots: false,
            canReadProcedures: false,
            canReadContracts: false);

        Assert.Equal(0, result.Counters.ProjectsTotal);
        Assert.Equal(0, result.Counters.LotsTotal);
        Assert.Equal(0, result.Counters.ProceduresTotal);
        Assert.Equal(0, result.Counters.ContractsTotal);
        Assert.Empty(result.LotStatuses);
        Assert.Empty(result.ProcedureStatuses);
        Assert.Empty(result.ContractStatuses);
        Assert.Null(result.LotStatusCounts);
        Assert.Null(result.ProcedureStatusCounts);
        Assert.Null(result.ContractStatusCounts);
    }

    [Fact]
    public async Task BuildAsync_WithScopedProjectRead_ShouldFilterProjectsByCurrentUser()
    {
        var appUserId = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create("dashboard-counters-scoped");
        await SeedCoreDataAsync(db, appUserId);

        var service = new DashboardCountersAndStatusesQueryService(db);
        var userContext = new DashboardUserContext(
            appUserId,
            new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            HasProjectsGlobalRead: false);

        var result = await service.BuildAsync(
            userContext,
            canReadProjects: true,
            canReadLots: true,
            canReadProcedures: true,
            canReadContracts: true);

        Assert.Equal(1, result.Counters.ProjectsTotal);
        Assert.Equal(2, result.Counters.LotsTotal);
        Assert.Equal(3, result.Counters.ProceduresTotal);
        Assert.Equal(3, result.Counters.ContractsTotal);

        Assert.NotNull(result.LotStatusCounts);
        Assert.Equal(1, result.LotStatusCounts!.GetValueOrDefault(LotStatus.Draft));
        Assert.Equal(1, result.LotStatusCounts.GetValueOrDefault(LotStatus.InProcurement));

        Assert.NotNull(result.ProcedureStatusCounts);
        Assert.Equal(1, result.ProcedureStatusCounts!.GetValueOrDefault(ProcurementProcedureStatus.OnApproval));
        Assert.Equal(1, result.ProcedureStatusCounts.GetValueOrDefault(ProcurementProcedureStatus.Completed));
        Assert.Equal(1, result.ProcedureStatusCounts.GetValueOrDefault(ProcurementProcedureStatus.Canceled));

        Assert.NotNull(result.ContractStatusCounts);
        Assert.Equal(1, result.ContractStatusCounts!.GetValueOrDefault(ContractStatus.Signed));
        Assert.Equal(1, result.ContractStatusCounts.GetValueOrDefault(ContractStatus.Active));
        Assert.Equal(1, result.ContractStatusCounts.GetValueOrDefault(ContractStatus.Closed));
    }

    [Fact]
    public async Task BuildAsync_WithGlobalProjectRead_ShouldReturnAllProjects()
    {
        var appUserId = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create("dashboard-counters-global");
        await SeedCoreDataAsync(db, appUserId);

        var service = new DashboardCountersAndStatusesQueryService(db);
        var userContext = new DashboardUserContext(
            appUserId,
            new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            HasProjectsGlobalRead: true);

        var result = await service.BuildAsync(
            userContext,
            canReadProjects: true,
            canReadLots: false,
            canReadProcedures: false,
            canReadContracts: false);

        Assert.Equal(2, result.Counters.ProjectsTotal);
        Assert.Equal(0, result.Counters.LotsTotal);
        Assert.Equal(0, result.Counters.ProceduresTotal);
        Assert.Equal(0, result.Counters.ContractsTotal);
    }

    private static async Task SeedCoreDataAsync(AppDbContext db, Guid appUserId)
    {
        var ownProject = new Project
        {
            Code = "PRJ-OWN",
            Name = "Own Project",
            GipUserId = appUserId
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

        var procedureOnApproval = CreateProcedure(lotDraft.Id, ProcurementProcedureStatus.OnApproval);
        var procedureCompleted = CreateProcedure(lotInProc.Id, ProcurementProcedureStatus.Completed);
        var procedureCanceled = CreateProcedure(Guid.NewGuid(), ProcurementProcedureStatus.Canceled);

        var contractSigned = CreateContract("CTR-SIGNED", ContractStatus.Signed);
        var contractActive = CreateContract("CTR-ACTIVE", ContractStatus.Active);
        var contractClosed = CreateContract("CTR-CLOSED", ContractStatus.Closed);

        await db.Set<Project>().AddRangeAsync(ownProject, foreignProject);
        await db.Set<Lot>().AddRangeAsync(lotDraft, lotInProc);
        await db.Set<ProcurementProcedure>().AddRangeAsync(procedureOnApproval, procedureCompleted, procedureCanceled);
        await db.Set<Contract>().AddRangeAsync(contractSigned, contractActive, contractClosed);
        await db.SaveChangesAsync();
    }

    private static ProcurementProcedure CreateProcedure(Guid lotId, ProcurementProcedureStatus status)
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
            AnalyticsLevel5Code = "A5"
        };
    }

    private static Contract CreateContract(string number, ContractStatus status)
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
            EndDate = DateTime.UtcNow.Date.AddDays(10),
            Status = status
        };
    }
}
