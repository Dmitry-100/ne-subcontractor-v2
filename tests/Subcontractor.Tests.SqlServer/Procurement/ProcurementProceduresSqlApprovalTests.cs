using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Files;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Procurement;

[Trait("SqlSuite", "Core")]
public sealed class ProcurementProceduresSqlApprovalTests
{
    [SqlFact]
    public async Task DecideApprovalStepAsync_WhenAllRequiredStepsApproved_ShouldMoveProcedureToSent()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.InSystem, ProcurementProcedureStatus.Created);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var steps = await service.ConfigureApprovalStepsAsync(procedureId, new ConfigureProcedureApprovalRequest
        {
            Steps =
            [
                new ConfigureProcedureApprovalStepRequest
                {
                    StepOrder = 1,
                    StepTitle = "Шаг 1",
                    ApproverRoleName = "COMM",
                    IsRequired = true
                },
                new ConfigureProcedureApprovalStepRequest
                {
                    StepOrder = 2,
                    StepTitle = "Шаг 2",
                    ApproverRoleName = "TECH",
                    IsRequired = true
                }
            ]
        });

        await service.TransitionAsync(procedureId, new ProcedureStatusTransitionRequest
        {
            TargetStatus = ProcurementProcedureStatus.OnApproval
        });

        await service.DecideApprovalStepAsync(
            procedureId,
            steps[0].Id,
            new DecideProcedureApprovalStepRequest { DecisionStatus = ProcedureApprovalStepStatus.Approved });

        var second = await service.DecideApprovalStepAsync(
            procedureId,
            steps[1].Id,
            new DecideProcedureApprovalStepRequest { DecisionStatus = ProcedureApprovalStepStatus.Approved });

        Assert.NotNull(second);
        Assert.Equal(ProcedureApprovalStepStatus.Approved, second!.Status);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        Assert.Equal(ProcurementProcedureStatus.Sent, procedure.Status);
    }

    [SqlFact]
    public async Task UpsertExternalApprovalAsync_ApprovedDecision_ShouldMoveProcedureToSent_AndBindProtocol()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.External, ProcurementProcedureStatus.OnApproval);

        var protocolFile = CreateFile("sql-external-approved.pdf");
        await db.Set<StoredFile>().AddAsync(protocolFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var result = await service.UpsertExternalApprovalAsync(
            procedureId,
            new UpsertProcedureExternalApprovalRequest
            {
                IsApproved = true,
                DecisionDate = DateTime.UtcNow.Date,
                ResponsibleUserId = Guid.NewGuid(),
                ProtocolFileId = protocolFile.Id,
                Comment = "  Внешнее согласование получено  "
            });

        Assert.True(result.IsApproved);
        Assert.Equal("Внешнее согласование получено", result.Comment);
        Assert.Equal(protocolFile.Id, result.ProtocolFileId);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        var procedureHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .SingleAsync(x => x.ProcedureId == procedureId && x.ToStatus == ProcurementProcedureStatus.Sent);
        var storedProtocolFile = await db.Set<StoredFile>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == protocolFile.Id);

        Assert.Equal(ProcurementProcedureStatus.Sent, procedure.Status);
        Assert.Equal("Внешнее согласование получено", procedureHistory.Reason);
        Assert.Equal("PROC_EXTERNAL_APPROVAL", storedProtocolFile.OwnerEntityType);
        Assert.Equal(procedureId, storedProtocolFile.OwnerEntityId);
    }

    [SqlFact]
    public async Task UpsertExternalApprovalAsync_NegativeDecisionWithoutComment_ShouldThrow()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.External, ProcurementProcedureStatus.OnApproval);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.UpsertExternalApprovalAsync(
            procedureId,
            new UpsertProcedureExternalApprovalRequest
            {
                IsApproved = false,
                Comment = "   "
            }));

        Assert.Equal("Comment is required when external approval is negative. (Parameter 'Comment')", error.Message);

        var procedure = await db.Set<ProcurementProcedure>().AsNoTracking().SingleAsync(x => x.Id == procedureId);
        var approval = await db.Set<ProcedureExternalApproval>()
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.ProcedureId == procedureId);
        var statusChanges = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .Where(x =>
                x.ProcedureId == procedureId &&
                (x.ToStatus == ProcurementProcedureStatus.Sent || x.ToStatus == ProcurementProcedureStatus.DocumentsPreparation))
            .ToListAsync();

        Assert.Equal(ProcurementProcedureStatus.OnApproval, procedure.Status);
        Assert.Null(approval);
        Assert.Empty(statusChanges);
    }

    private static async Task<Guid> SeedProcedureAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        ProcedureApprovalMode approvalMode,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-SQL-AP-{Guid.NewGuid():N}"[..16],
            Name = "SQL approval lot",
            Status = LotStatus.InProcurement
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = approvalMode,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Approval SQL procedure",
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

    private static StoredFile CreateFile(string fileName)
    {
        return new StoredFile
        {
            FileName = fileName,
            ContentType = "application/pdf",
            FileSizeBytes = 256,
            Content = [1, 2, 3],
            OwnerEntityType = "UNASSIGNED",
            OwnerEntityId = Guid.Empty
        };
    }
}
