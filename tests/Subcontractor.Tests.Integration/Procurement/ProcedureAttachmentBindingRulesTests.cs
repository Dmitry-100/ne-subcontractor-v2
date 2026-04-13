using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Files;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcedureAttachmentBindingRulesTests
{
    [Fact]
    public async Task CreateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow_AndPersistNothing()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var lotId = await SeedInProcurementLotAsync(db);

        var conflictingFile = CreateFile(
            "request-locked-create.pdf",
            ownerEntityType: "PROC_OFFER",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(
            new CreateProcedureRequest
            {
                LotId = lotId,
                PurchaseTypeCode = "PT-TEST",
                ObjectName = "Create with conflicting attachment",
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
        var histories = await db.Set<ProcurementProcedureStatusHistory>()
            .AsNoTracking()
            .ToListAsync();
        var fileState = await db.Set<StoredFile>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == conflictingFile.Id);

        Assert.Empty(procedures);
        Assert.Empty(histories);
        Assert.Equal("PROC_OFFER", fileState.OwnerEntityType);
        Assert.NotEqual(Guid.Empty, fileState.OwnerEntityId);
    }

    [Fact]
    public async Task UpdateAsync_WhenRequestAttachmentAlreadyBoundToAnotherEntity_ShouldThrow()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.InSystem, ProcurementProcedureStatus.Created);

        var conflictingFile = CreateFile(
            "request-locked.pdf",
            ownerEntityType: "PROC_OFFER",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateAsync(
            procedureId,
            BuildUpdateRequest(new[] { conflictingFile.Id })));

        Assert.Contains("already attached", error.Message, StringComparison.OrdinalIgnoreCase);

        var procedure = await db.Set<ProcurementProcedure>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == procedureId);
        var fileState = await db.Set<StoredFile>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == conflictingFile.Id);

        Assert.Equal("Procedure with attachments", procedure.ObjectName);
        Assert.Equal("PT-TEST", procedure.PurchaseTypeCode);
        Assert.Equal("PROC_OFFER", fileState.OwnerEntityType);
        Assert.NotEqual(Guid.Empty, fileState.OwnerEntityId);
    }

    [Fact]
    public async Task UpsertExternalApprovalAsync_WhenProtocolAlreadyBoundToAnotherEntity_ShouldThrow()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.External, ProcurementProcedureStatus.OnApproval);

        var conflictingFile = CreateFile(
            "external-protocol.pdf",
            ownerEntityType: "PROC_OFFER",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertExternalApprovalAsync(
            procedureId,
            new UpsertProcedureExternalApprovalRequest
            {
                IsApproved = true,
                DecisionDate = DateTime.UtcNow.Date,
                ProtocolFileId = conflictingFile.Id,
                Comment = "Approved"
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

    [Fact]
    public async Task UpsertExternalApprovalAsync_WhenProtocolReplaced_ShouldUnbindPreviousFile()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var procedureId = await SeedProcedureAsync(db, ProcedureApprovalMode.External, ProcurementProcedureStatus.OnApproval);

        var oldFile = CreateFile(
            "protocol-old.pdf",
            ownerEntityType: "PROC_EXTERNAL_APPROVAL",
            ownerEntityId: procedureId);
        var newFile = CreateFile("protocol-new.pdf");

        await db.Set<StoredFile>().AddRangeAsync(oldFile, newFile);
        await db.Set<ProcedureExternalApproval>().AddAsync(new ProcedureExternalApproval
        {
            ProcedureId = procedureId,
            IsApproved = null,
            ProtocolFileId = oldFile.Id
        });
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var dto = await service.UpsertExternalApprovalAsync(
            procedureId,
            new UpsertProcedureExternalApprovalRequest
            {
                IsApproved = true,
                DecisionDate = DateTime.UtcNow.Date,
                ProtocolFileId = newFile.Id,
                Comment = "Approved"
            });

        Assert.Equal(newFile.Id, dto.ProtocolFileId);

        var oldFileActual = await db.Set<StoredFile>().AsNoTracking().SingleAsync(x => x.Id == oldFile.Id);
        var newFileActual = await db.Set<StoredFile>().AsNoTracking().SingleAsync(x => x.Id == newFile.Id);

        Assert.Equal("UNASSIGNED", oldFileActual.OwnerEntityType);
        Assert.Equal(Guid.Empty, oldFileActual.OwnerEntityId);
        Assert.Equal("PROC_EXTERNAL_APPROVAL", newFileActual.OwnerEntityType);
        Assert.Equal(procedureId, newFileActual.OwnerEntityId);
    }

    [Fact]
    public async Task UpsertOffersAsync_WhenOfferFileAlreadyBoundToAnotherEntity_ShouldThrow()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForOffersAndOutcomeAsync(db, ProcurementProcedureStatus.Sent);

        await db.Set<ProcedureOffer>().AddAsync(new ProcedureOffer
        {
            ProcedureId = setup.ProcedureId,
            ContractorId = setup.FirstContractorId,
            OfferNumber = "OFR-BASE",
            AmountWithoutVat = 90m,
            VatAmount = 18m,
            TotalAmount = 108m,
            CurrencyCode = "RUB",
            DecisionStatus = ProcedureOfferDecisionStatus.Pending
        });

        var conflictingFile = CreateFile(
            "offer-locked.pdf",
            ownerEntityType: "PROC_REQUEST",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertOffersAsync(
            setup.ProcedureId,
            new UpdateProcedureOffersRequest
            {
                Items =
                [
                    new UpsertProcedureOfferItemRequest
                    {
                        ContractorId = setup.FirstContractorId,
                        OfferNumber = "OFR-1",
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
        Assert.Equal("OFR-BASE", offers[0].OfferNumber);
        Assert.Empty(statusHistory);
    }

    [Fact]
    public async Task UpsertOutcomeAsync_WhenProtocolAlreadyBoundToAnotherEntity_ShouldThrow()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForOffersAndOutcomeAsync(db, ProcurementProcedureStatus.OffersReceived);

        await db.Set<ProcedureOffer>().AddAsync(new ProcedureOffer
        {
            ProcedureId = setup.ProcedureId,
            ContractorId = setup.FirstContractorId,
            OfferNumber = "OUT-1",
            AmountWithoutVat = 100m,
            VatAmount = 20m,
            TotalAmount = 120m,
            CurrencyCode = "RUB",
            DecisionStatus = ProcedureOfferDecisionStatus.Pending
        });

        var conflictingFile = CreateFile(
            "outcome-locked.pdf",
            ownerEntityType: "PROC_REQUEST",
            ownerEntityId: Guid.NewGuid());

        await db.Set<StoredFile>().AddAsync(conflictingFile);
        await db.SaveChangesAsync();

        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpsertOutcomeAsync(
            setup.ProcedureId,
            new UpdateProcedureOutcomeRequest
            {
                WinnerContractorId = setup.FirstContractorId,
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
            .SingleAsync(x => x.Id == procedure.LotId);
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
            .Where(x => x.LotId == lot.Id)
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

    private static UpdateProcedureRequest BuildUpdateRequest(IReadOnlyCollection<Guid> attachmentFileIds)
    {
        return new UpdateProcedureRequest
        {
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Updated object",
            WorkScope = "Updated scope",
            CustomerName = "Customer",
            LeadOfficeCode = "LEAD",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5",
            AttachmentFileIds = attachmentFileIds
        };
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

    private static async Task<Guid> SeedProcedureAsync(
        Infrastructure.Persistence.AppDbContext db,
        ProcedureApprovalMode approvalMode,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-AB-{Guid.NewGuid():N}"[..16],
            Name = "Attachment-binding lot",
            Status = LotStatus.InProcurement
        };

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = approvalMode,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Procedure with attachments",
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

    private static async Task<Guid> SeedInProcurementLotAsync(Infrastructure.Persistence.AppDbContext db)
    {
        var lot = new Lot
        {
            Code = $"LOT-AB-CR-{Guid.NewGuid():N}"[..16],
            Name = "Attachment-binding create lot",
            Status = LotStatus.InProcurement
        };

        await db.Set<Lot>().AddAsync(lot);
        await db.SaveChangesAsync();
        return lot.Id;
    }

    private static async Task<OfferOutcomeSeedResult> SeedProcedureForOffersAndOutcomeAsync(
        Infrastructure.Persistence.AppDbContext db,
        ProcurementProcedureStatus status)
    {
        var lot = new Lot
        {
            Code = $"LOT-AB-OO-{Guid.NewGuid():N}"[..16],
            Name = "Attachment-binding offer lot",
            Status = LotStatus.InProcurement
        };

        var firstContractor = CreateContractor("7700000401", "Attachment contractor 1");
        var secondContractor = CreateContractor("7700000402", "Attachment contractor 2");

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = status,
            ApprovalMode = ProcedureApprovalMode.InSystem,
            PurchaseTypeCode = "PT-TEST",
            ObjectName = "Attachment procedure",
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
        await db.Set<Contractor>().AddRangeAsync(firstContractor, secondContractor);
        await db.Set<ProcurementProcedure>().AddAsync(procedure);
        await db.SaveChangesAsync();

        return new OfferOutcomeSeedResult(procedure.Id, firstContractor.Id, secondContractor.Id);
    }

    private static Contractor CreateContractor(string inn, string name)
    {
        return new Contractor
        {
            Inn = inn,
            Name = name,
            City = "Moscow",
            ContactName = name,
            Phone = "+70000000000",
            Email = $"{inn}@example.local",
            CapacityHours = 100m,
            CurrentRating = 4.0m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active
        };
    }

    private sealed record OfferOutcomeSeedResult(
        Guid ProcedureId,
        Guid FirstContractorId,
        Guid SecondContractorId);
}
