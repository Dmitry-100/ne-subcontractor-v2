using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Contracts;

public sealed class ContractsControllerTests
{
    [Fact]
    public async Task Transition_UnknownContract_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.Transition(
            Guid.NewGuid(),
            new ContractStatusTransitionRequest
            {
                TargetStatus = ContractStatus.OnApproval
            },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Transition_InvalidStep_ShouldReturnConflict()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Draft, DateTime.UtcNow.Date);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.Transition(
            contract.Id,
            new ContractStatusTransitionRequest
            {
                TargetStatus = ContractStatus.Signed
            },
            CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task History_ShouldReturnOkWithItems()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.OnApproval, DateTime.UtcNow.Date);
        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractStatusHistory>().AddAsync(new ContractStatusHistory
        {
            ContractId = contract.Id,
            FromStatus = ContractStatus.Draft,
            ToStatus = ContractStatus.OnApproval,
            Reason = "Initial approval"
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.History(contract.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<ContractStatusHistoryItemDto>>(ok.Value);
        Assert.Single(payload);
    }

    [Fact]
    public async Task GetMilestones_UnknownContract_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.GetMilestones(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpsertMilestones_DraftContract_ShouldReturnConflict()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Draft, signingDate: null);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.UpsertMilestones(
            contract.Id,
            new UpdateContractMilestonesRequest
            {
                Items =
                [
                    new UpsertContractMilestoneItemRequest
                    {
                        Title = "Draft milestone",
                        PlannedDate = DateTime.UtcNow.Date,
                        ProgressPercent = 10m,
                        SortOrder = 0
                    }
                ]
            },
            CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Contains("Milestones can be edited only", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExecutionSummary_ShouldReturnOkWithComputedPayload()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active, DateTime.UtcNow.Date.AddDays(-20));
        await db.Set<Contract>().AddAsync(contract);
        await db.Set<ContractMilestone>().AddRangeAsync(
            new ContractMilestone
            {
                ContractId = contract.Id,
                Title = "Completed",
                PlannedDate = DateTime.UtcNow.Date.AddDays(-10),
                ActualDate = DateTime.UtcNow.Date.AddDays(-9),
                ProgressPercent = 100m,
                SortOrder = 0
            },
            new ContractMilestone
            {
                ContractId = contract.Id,
                Title = "Overdue",
                PlannedDate = DateTime.UtcNow.Date.AddDays(-1),
                ProgressPercent = 60m,
                SortOrder = 1
            });
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.ExecutionSummary(contract.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ContractExecutionSummaryDto>(ok.Value);
        Assert.Equal(2, payload.MilestonesTotal);
        Assert.Equal(1, payload.OverdueMilestones);
    }

    [Fact]
    public async Task GetMonitoringControlPoints_UnknownContract_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.GetMonitoringControlPoints(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpsertMonitoringControlPoints_ActiveContract_ShouldReturnOk()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active, DateTime.UtcNow.Date.AddDays(-2));
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.UpsertMonitoringControlPoints(
            contract.Id,
            new UpdateContractMonitoringControlPointsRequest
            {
                Items =
                [
                    new UpsertContractMonitoringControlPointItemRequest
                    {
                        Name = "КП контроллера",
                        PlannedDate = DateTime.UtcNow.Date,
                        ProgressPercent = 50m,
                        SortOrder = 0
                    }
                ]
            },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<ContractMonitoringControlPointDto>>(ok.Value);
        Assert.Single(payload);
    }

    [Fact]
    public async Task UpsertMdrCards_DraftContract_ShouldReturnConflict()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Draft, signingDate: null);
        await db.Set<Contract>().AddAsync(contract);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.UpsertMdrCards(
            contract.Id,
            new UpdateContractMdrCardsRequest
            {
                Items =
                [
                    new UpsertContractMdrCardItemRequest
                    {
                        Title = "MDR draft",
                        ReportingDate = DateTime.UtcNow.Date,
                        SortOrder = 0
                    }
                ]
            },
            CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Contains("MDR cards can be edited only", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ImportMdrForecastFact_UnknownContract_ShouldReturnNotFound()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = await controller.ImportMdrForecastFact(
            Guid.NewGuid(),
            new ImportContractMdrForecastFactRequest
            {
                Items =
                [
                    new ImportContractMdrForecastFactItemRequest
                    {
                        SourceRowNumber = 2,
                        CardTitle = "MDR-Апрель",
                        ReportingDate = DateTime.UtcNow.Date,
                        RowCode = "MDR-001",
                        ForecastValue = 120m,
                        FactValue = 100m
                    }
                ]
            },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task ImportMdrForecastFact_StrictConflicts_ShouldReturnOkWithAppliedFalse()
    {
        await using var db = TestDbContextFactory.Create();
        var contract = CreateContract(ContractStatus.Active, DateTime.UtcNow.Date.AddDays(-2));
        await db.Set<Contract>().AddAsync(contract);

        var card = new ContractMdrCard
        {
            ContractId = contract.Id,
            Title = "MDR-Апрель",
            ReportingDate = DateTime.UtcNow.Date,
            SortOrder = 0
        };
        card.Rows.Add(new ContractMdrRow
        {
            RowCode = "MDR-001",
            Description = "Разработка КМ",
            UnitCode = "MH",
            PlanValue = 100m,
            ForecastValue = 110m,
            FactValue = 90m,
            SortOrder = 0
        });
        await db.Set<ContractMdrCard>().AddAsync(card);
        await db.SaveChangesAsync();

        var controller = CreateController(db);
        var result = await controller.ImportMdrForecastFact(
            contract.Id,
            new ImportContractMdrForecastFactRequest
            {
                SkipConflicts = false,
                Items =
                [
                    new ImportContractMdrForecastFactItemRequest
                    {
                        SourceRowNumber = 2,
                        CardTitle = "MDR-Апрель",
                        ReportingDate = DateTime.UtcNow.Date,
                        RowCode = "MDR-001",
                        ForecastValue = 130m,
                        FactValue = 100m
                    },
                    new ImportContractMdrForecastFactItemRequest
                    {
                        SourceRowNumber = 3,
                        CardTitle = "MDR-Апрель",
                        ReportingDate = DateTime.UtcNow.Date,
                        RowCode = "MDR-UNKNOWN",
                        ForecastValue = 10m,
                        FactValue = 5m
                    }
                ]
            },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ImportContractMdrForecastFactResultDto>(ok.Value);
        Assert.False(payload.Applied);
        Assert.Equal(1, payload.ConflictRows);
        Assert.Contains(payload.Conflicts, x => x.Code == "TARGET_NOT_FOUND");
    }

    [Fact]
    public async Task DownloadControlPointsTemplate_ShouldReturnCsvFile()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = controller.DownloadControlPointsTemplate();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
        Assert.Equal("contract-monitoring-control-points-template.csv", file.FileDownloadName);
        var content = Encoding.UTF8.GetString(file.FileContents);
        Assert.Contains("ControlPointName", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("StageName", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DownloadMdrCardsTemplate_ShouldReturnCsvFile()
    {
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db);

        var result = controller.DownloadMdrCardsTemplate();

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", file.ContentType);
        Assert.Equal("contract-monitoring-mdr-template.csv", file.FileDownloadName);
        var content = Encoding.UTF8.GetString(file.FileContents);
        Assert.Contains("CardTitle", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("RowCode", content, StringComparison.OrdinalIgnoreCase);
    }

    private static ContractsController CreateController(Infrastructure.Persistence.AppDbContext db)
    {
        var service = new ContractsService(db);
        return new ContractsController(service);
    }

    private static Contract CreateContract(ContractStatus status, DateTime? signingDate)
    {
        return new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = Guid.NewGuid(),
            ContractorId = Guid.NewGuid(),
            ContractNumber = $"CTR-{Guid.NewGuid():N}".Substring(0, 18),
            SigningDate = signingDate,
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(10),
            Status = status
        };
    }
}
