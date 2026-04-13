using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcedureApprovalWorkflowTests
{
    [Fact]
    public async Task ConfigureApprovalStepsAsync_WithDraftProcedure_ShouldPersistSortedRouteAndMoveToDocumentsPreparation()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.InSystem, ProcurementProcedureStatus.Created);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var configured = await service.ConfigureApprovalStepsAsync(procedureId, new ConfigureProcedureApprovalRequest
        {
            Steps =
            [
                new ConfigureProcedureApprovalStepRequest
                {
                    StepOrder = 20,
                    StepTitle = " Финансовый контроль ",
                    ApproverRoleName = " FIN_CONTROL ",
                    IsRequired = true
                },
                new ConfigureProcedureApprovalStepRequest
                {
                    StepOrder = 10,
                    StepTitle = "Коммерческий директор",
                    ApproverUserId = Guid.NewGuid(),
                    IsRequired = true
                }
            ]
        });

        Assert.Equal(2, configured.Count);
        Assert.Equal(10, configured[0].StepOrder);
        Assert.Equal("Коммерческий директор", configured[0].StepTitle);
        Assert.Equal(20, configured[1].StepOrder);
        Assert.Equal("FIN_CONTROL", configured[1].ApproverRoleName);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        Assert.Equal(ProcurementProcedureStatus.DocumentsPreparation, procedure.Status);
    }

    [Fact]
    public async Task DecideApprovalStepAsync_WhenAllRequiredStepsApproved_ShouldMoveProcedureToSent()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.InSystem, ProcurementProcedureStatus.Created);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var steps = await service.ConfigureApprovalStepsAsync(procedureId, new ConfigureProcedureApprovalRequest
        {
            Steps =
            [
                new ConfigureProcedureApprovalStepRequest
                {
                    StepOrder = 1,
                    StepTitle = "Коммерческое согласование",
                    ApproverRoleName = "COMM",
                    IsRequired = true
                },
                new ConfigureProcedureApprovalStepRequest
                {
                    StepOrder = 2,
                    StepTitle = "Техническое согласование",
                    ApproverRoleName = "TECH",
                    IsRequired = true
                }
            ]
        });

        await service.TransitionAsync(procedureId, new ProcedureStatusTransitionRequest
        {
            TargetStatus = ProcurementProcedureStatus.OnApproval
        });

        var firstDecision = await service.DecideApprovalStepAsync(
            procedureId,
            steps[0].Id,
            new DecideProcedureApprovalStepRequest
            {
                DecisionStatus = ProcedureApprovalStepStatus.Approved
            });

        Assert.NotNull(firstDecision);
        Assert.Equal(ProcedureApprovalStepStatus.Approved, firstDecision!.Status);

        var secondDecision = await service.DecideApprovalStepAsync(
            procedureId,
            steps[1].Id,
            new DecideProcedureApprovalStepRequest
            {
                DecisionStatus = ProcedureApprovalStepStatus.Approved
            });

        Assert.NotNull(secondDecision);
        Assert.Equal(ProcedureApprovalStepStatus.Approved, secondDecision!.Status);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        var sentHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == procedureId && x.ToStatus == ProcurementProcedureStatus.Sent)
            .ToListAsync();

        Assert.Equal(ProcurementProcedureStatus.Sent, procedure.Status);
        Assert.Single(sentHistory);
    }

    [Fact]
    public async Task UpsertExternalApprovalAsync_NegativeDecisionWithoutComment_ShouldThrow()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.External, ProcurementProcedureStatus.OnApproval);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertExternalApprovalAsync(
            procedureId,
            new UpsertProcedureExternalApprovalRequest
            {
                IsApproved = false,
                DecisionDate = DateTime.UtcNow.Date,
                Comment = "   "
            }));

        Assert.Equal("Comment is required when external approval is negative. (Parameter 'Comment')", error.Message);
    }

    [Fact]
    public async Task UpsertExternalApprovalAsync_ApprovedDecision_ShouldMoveProcedureToSent()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.External, ProcurementProcedureStatus.OnApproval);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var dto = await service.UpsertExternalApprovalAsync(
            procedureId,
            new UpsertProcedureExternalApprovalRequest
            {
                IsApproved = true,
                DecisionDate = DateTime.UtcNow.Date,
                Comment = "Одобрено"
            });

        Assert.True(dto.IsApproved);
        Assert.Equal("Одобрено", dto.Comment);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        Assert.Equal(ProcurementProcedureStatus.Sent, procedure.Status);
    }

    private static async Task<Guid> SeedProcedureAsync(
        Infrastructure.Persistence.AppDbContext db,
        ProcedureApprovalMode approvalMode,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-AP-{Guid.NewGuid():N}"[..16],
            Name = "Approval integration lot",
            Status = LotStatus.InProcurement
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = approvalMode,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Approval procedure",
            WorkScope = "Scope",
            CustomerName = "Customer",
            LeadOfficeCode = "LEAD",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5"
        };

        await db.Set<Lot>().AddAsync(lot);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);
        await db.SaveChangesAsync();

        return procedure.Id;
    }
}
