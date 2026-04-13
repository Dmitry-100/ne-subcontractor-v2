using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Files;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Procurement;

[Trait("SqlSuite", "Core")]
public sealed class ProcurementProceduresSqlAttachmentBindingTests
{
    [SqlFact]
    public async Task CreateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");

        var lotId = await SeedInProcurementLotAsync(db);
        var conflictingFile = CreateFile(
            "sql-request-locked.pdf",
            ownerEntityType: "PROC_OFFER",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(
            new CreateProcedureRequest
            {
                LotId = lotId,
                PurchaseTypeCode = "PT-TEST",
                ObjectName = "SQL create with conflicting attachment",
                WorkScope = "Scope",
                CustomerName = "Customer",
                LeadOfficeCode = "LEAD",
                AnalyticsLevel1Code = "A1",
                AnalyticsLevel2Code = "A2",
                AnalyticsLevel3Code = "A3",
                AnalyticsLevel4Code = "A4",
                AnalyticsLevel5Code = "A5",
                AttachmentFileIds = [conflictingFile.Id]
            }));

        Assert.Contains("already attached", error.Message, StringComparison.OrdinalIgnoreCase);

        var procedures = await db.Set<ProcurementProcedure>()
            .AsNoTracking()
            .Where(x => x.LotId == lotId)
            .ToListAsync();
        var procedureHistoryRows = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .ToListAsync();
        var fileState = await db.Set<StoredFile>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == conflictingFile.Id);

        Assert.Empty(procedures);
        Assert.Empty(procedureHistoryRows);
        Assert.Equal("PROC_OFFER", fileState.OwnerEntityType);
        Assert.NotEqual(Guid.Empty, fileState.OwnerEntityId);
    }

    [SqlFact]
    public async Task UpsertExternalApprovalAsync_WhenProtocolAlreadyBoundToAnotherEntity_ShouldThrow()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.External, ProcurementProcedureStatus.OnApproval);

        var conflictingFile = CreateFile(
            "sql-external-locked.pdf",
            ownerEntityType: "PROC_OFFER",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertExternalApprovalAsync(
            procedureId,
            new UpsertProcedureExternalApprovalRequest
            {
                IsApproved = true,
                DecisionDate = DateTime.UtcNow.Date,
                ProtocolFileId = conflictingFile.Id,
                Comment = "approved"
            }));

        Assert.Contains("already attached", error.Message, StringComparison.OrdinalIgnoreCase);

        var procedure = await db.Set<ProcurementProcedure>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == procedureId);
        var externalApproval = await db.Set<ProcedureExternalApproval>()
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.ProcedureId == procedureId);
        var statusHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .Where(x =>
                x.ProcedureId == procedureId &&
                (x.ToStatus == ProcurementProcedureStatus.Sent ||
                 x.ToStatus == ProcurementProcedureStatus.DocumentsPreparation))
            .ToListAsync();
        var fileState = await db.Set<StoredFile>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == conflictingFile.Id);

        Assert.Equal(ProcurementProcedureStatus.OnApproval, procedure.Status);
        Assert.Null(externalApproval);
        Assert.Empty(statusHistory);
        Assert.Equal("PROC_OFFER", fileState.OwnerEntityType);
        Assert.NotEqual(Guid.Empty, fileState.OwnerEntityId);
    }

    [SqlFact]
    public async Task UpdateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.InSystem, ProcurementProcedureStatus.Created);

        var conflictingFile = CreateFile(
            "sql-request-update-locked.pdf",
            ownerEntityType: "PROC_OFFER",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(
            procedureId,
            new UpdateProcedureRequest
            {
                PurchaseTypeCode = "PT-UPDATED",
                ObjectName = "Updated object name",
                WorkScope = "Updated scope",
                CustomerName = "Updated customer",
                LeadOfficeCode = "UPD",
                AnalyticsLevel1Code = "U1",
                AnalyticsLevel2Code = "U2",
                AnalyticsLevel3Code = "U3",
                AnalyticsLevel4Code = "U4",
                AnalyticsLevel5Code = "U5",
                AttachmentFileIds = [conflictingFile.Id]
            }));

        Assert.Contains("already attached", error.Message, StringComparison.OrdinalIgnoreCase);

        var procedure = await db.Set<ProcurementProcedure>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == procedureId);
        var fileState = await db.Set<StoredFile>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == conflictingFile.Id);

        Assert.Equal("SQL attachment procedure", procedure.ObjectName);
        Assert.Equal("PT-TEST", procedure.PurchaseTypeCode);
        Assert.Equal("PROC_OFFER", fileState.OwnerEntityType);
        Assert.NotEqual(Guid.Empty, fileState.OwnerEntityId);
    }

    [SqlFact]
    public async Task UpsertOffersAsync_WhenOfferFileAlreadyBoundToAnotherEntity_ShouldThrow()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.Sent);

        await db.Set<ProcedureOffer>().AddAsync(new ProcedureOffer
        {
            ProcedureId = setup.ProcedureId,
            ContractorId = setup.ContractorId,
            OfferNumber = "SQL-OFR-BASE",
            AmountWithoutVat = 90m,
            VatAmount = 18m,
            TotalAmount = 108m,
            CurrencyCode = "RUB",
            DecisionStatus = ProcedureOfferDecisionStatus.Pending
        });

        var conflictingFile = CreateFile(
            "sql-offer-locked.pdf",
            ownerEntityType: "PROC_REQUEST",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertOffersAsync(
            setup.ProcedureId,
            new UpdateProcedureOffersRequest
            {
                Items =
                [
                    new UpsertProcedureOfferItemRequest
                    {
                        ContractorId = setup.ContractorId,
                        OfferNumber = "SQL-OFR-1",
                        AmountWithoutVat = 100m,
                        VatAmount = 20m,
                        TotalAmount = 120m,
                        CurrencyCode = "RUB",
                        OfferFileId = conflictingFile.Id
                    }
                ]
            }));

        Assert.Contains("already attached", error.Message, StringComparison.OrdinalIgnoreCase);

        var procedure = await db.Set<ProcurementProcedure>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == setup.ProcedureId);
        var offers = await db.Set<ProcedureOffer>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .OrderBy(x => x.OfferNumber)
            .ToListAsync();
        var statusHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId && x.ToStatus == ProcurementProcedureStatus.OffersReceived)
            .ToListAsync();

        Assert.Equal(ProcurementProcedureStatus.Sent, procedure.Status);
        Assert.Single(offers);
        Assert.Equal("SQL-OFR-BASE", offers[0].OfferNumber);
        Assert.Empty(statusHistory);
    }

    [SqlFact]
    public async Task UpsertOutcomeAsync_WhenProtocolAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForOffersAsync(db, ProcurementProcedureStatus.OffersReceived);

        await db.Set<ProcedureOffer>().AddAsync(new ProcedureOffer
        {
            ProcedureId = setup.ProcedureId,
            ContractorId = setup.ContractorId,
            OfferNumber = "SQL-OUT-BASE",
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            CurrencyCode = "RUB",
            DecisionStatus = ProcedureOfferDecisionStatus.Pending
        });

        var conflictingFile = CreateFile(
            "sql-outcome-locked.pdf",
            ownerEntityType: "PROC_REQUEST",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertOutcomeAsync(
            setup.ProcedureId,
            new UpdateProcedureOutcomeRequest
            {
                WinnerContractorId = setup.ContractorId,
                DecisionDate = DateTime.UtcNow.Date,
                IsCanceled = false,
                ProtocolFileId = conflictingFile.Id,
                Comment = "winner"
            }));

        Assert.Contains("already attached", error.Message, StringComparison.OrdinalIgnoreCase);

        var procedure = await db.Set<ProcurementProcedure>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == setup.ProcedureId);
        var lot = await db.Set<Lot>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == setup.LotId);
        var outcome = await db.Set<ProcedureOutcome>()
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.ProcedureId == setup.ProcedureId);
        var offers = await db.Set<ProcedureOffer>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .ToListAsync();
        var statusHistory = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .Where(x =>
                x.ProcedureId == setup.ProcedureId &&
                (x.ToStatus == ProcurementProcedureStatus.DecisionMade ||
                 x.ToStatus == ProcurementProcedureStatus.Retender))
            .ToListAsync();
        var lotHistory = await db.Set<LotStatusHistory>()
            .AsNoTracking()
            .Where(x => x.LotId == setup.LotId)
            .ToListAsync();
        var fileState = await db.Set<StoredFile>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == conflictingFile.Id);

        Assert.Equal(ProcurementProcedureStatus.OffersReceived, procedure.Status);
        Assert.Equal(LotStatus.InProcurement, lot.Status);
        Assert.Null(outcome);
        Assert.All(offers, x => Assert.NotEqual(ProcedureOfferDecisionStatus.Winner, x.DecisionStatus));
        Assert.Empty(statusHistory);
        Assert.Empty(lotHistory);
        Assert.Equal("PROC_REQUEST", fileState.OwnerEntityType);
        Assert.NotEqual(Guid.Empty, fileState.OwnerEntityId);
    }

    private static async Task<Guid> SeedProcedureAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        ProcedureApprovalMode approvalMode,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-SQL-AB-{Guid.NewGuid():N}"[..16],
            Name = "SQL attachment lot",
            Status = LotStatus.InProcurement
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = approvalMode,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "SQL attachment procedure",
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

    private static async Task<Guid> SeedInProcurementLotAsync(Subcontractor.Infrastructure.Persistence.AppDbContext db)
    {
        var lot = new Lot
        {
            Code = $"LOT-SQL-AB-CR-{Guid.NewGuid():N}"[..16],
            Name = "SQL create attachment lot",
            Status = LotStatus.InProcurement
        };

        await db.Set<Lot>().AddAsync(lot);
        await db.SaveChangesAsync();
        return lot.Id;
    }

    private static async Task<OfferSeedResult> SeedProcedureForOffersAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-SQL-AB-OF-{Guid.NewGuid():N}"[..16],
            Name = "SQL offer attachment lot",
            Status = LotStatus.InProcurement
        };

        var contractor = new Contractor
        {
            Inn = "7700000501",
            Name = "SQL attachment contractor",
            City = "Moscow",
            ContactName = "SQL attachment contractor",
            Phone = "+70000000000",
            Email = "sql.attachment.contractor@example.local",
            CapacityHours = 100m,
            CurrentRating = 4.2m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = ProcedureApprovalMode.InSystem,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "SQL offer attachment procedure",
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
        await db.Set<Contractor>().AddAsync(contractor);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);
        await db.SaveChangesAsync();

        return new OfferSeedResult(procedure.Id, lot.Id, contractor.Id);
    }

    private static StoredFile CreateFile(string fileName, string ownerEntityType = "UNASSIGNED", Guid? ownerEntityId = null)
    {
        return new StoredFile
        {
            FileName = fileName,
            ContentType = "application/pdf",
            FileSizeBytes = 128,
            Content = [1, 2, 3],
            OwnerEntityType = ownerEntityType,
            OwnerEntityId = ownerEntityId ?? Guid.Empty
        };
    }

    private sealed record OfferSeedResult(Guid ProcedureId, Guid LotId, Guid ContractorId);
}
