using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Files;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureAttachmentBindingService
{
    private const string RequestFileOwnerEntityType = "PROC_REQUEST";
    private const string ExternalApprovalProtocolFileOwnerEntityType = "PROC_EXTERNAL_APPROVAL";
    private const string OfferFileOwnerEntityType = "PROC_OFFER";
    private const string OutcomeProtocolFileOwnerEntityType = "PROC_OUTCOME_PROTOCOL";
    private const string UnassignedFileOwnerEntityType = "UNASSIGNED";

    private readonly IApplicationDbContext _dbContext;

    public ProcedureAttachmentBindingService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task RebindRequestAttachmentsAsync(
        Guid procedureId,
        IReadOnlyCollection<Guid>? attachmentFileIds,
        CancellationToken cancellationToken = default)
    {
        var targetFileIds = NormalizeAttachmentIds(attachmentFileIds);
        var currentlyBound = await _dbContext.Set<StoredFile>()
            .Where(x => x.OwnerEntityType == RequestFileOwnerEntityType && x.OwnerEntityId == procedureId)
            .ToListAsync(cancellationToken);

        foreach (var file in currentlyBound.Where(x => !targetFileIds.Contains(x.Id)))
        {
            file.OwnerEntityType = UnassignedFileOwnerEntityType;
            file.OwnerEntityId = Guid.Empty;
        }

        if (targetFileIds.Count == 0)
        {
            return;
        }

        var filesToBind = await _dbContext.Set<StoredFile>()
            .Where(x => targetFileIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (filesToBind.Count != targetFileIds.Count)
        {
            var missing = targetFileIds.Where(x => filesToBind.All(f => f.Id != x)).ToArray();
            throw new ArgumentException($"Attachment files not found: {string.Join(", ", missing)}", nameof(attachmentFileIds));
        }

        foreach (var file in filesToBind)
        {
            var attachedToAnotherEntity = file.OwnerEntityType != RequestFileOwnerEntityType &&
                                          file.OwnerEntityType != UnassignedFileOwnerEntityType;

            if (attachedToAnotherEntity)
            {
                throw new InvalidOperationException($"File '{file.FileName}' is already attached to '{file.OwnerEntityType}'.");
            }

            if (file.OwnerEntityType == RequestFileOwnerEntityType && file.OwnerEntityId != procedureId)
            {
                throw new InvalidOperationException($"File '{file.FileName}' is already attached to another procedure.");
            }

            file.OwnerEntityType = RequestFileOwnerEntityType;
            file.OwnerEntityId = procedureId;
        }
    }

    public async Task RebindExternalApprovalProtocolAsync(
        Guid procedureId,
        Guid? oldProtocolFileId,
        Guid? newProtocolFileId,
        CancellationToken cancellationToken = default)
    {
        if (oldProtocolFileId.HasValue && oldProtocolFileId != newProtocolFileId)
        {
            var oldFile = await _dbContext.Set<StoredFile>()
                .FirstOrDefaultAsync(x => x.Id == oldProtocolFileId.Value, cancellationToken);

            if (oldFile is not null &&
                oldFile.OwnerEntityType == ExternalApprovalProtocolFileOwnerEntityType &&
                oldFile.OwnerEntityId == procedureId)
            {
                oldFile.OwnerEntityType = UnassignedFileOwnerEntityType;
                oldFile.OwnerEntityId = Guid.Empty;
            }
        }

        if (!newProtocolFileId.HasValue)
        {
            return;
        }

        var newFile = await _dbContext.Set<StoredFile>()
            .FirstOrDefaultAsync(x => x.Id == newProtocolFileId.Value, cancellationToken);

        if (newFile is null)
        {
            throw new ArgumentException($"Protocol file '{newProtocolFileId}' not found.", nameof(newProtocolFileId));
        }

        var attachedToAnotherEntity = newFile.OwnerEntityType != UnassignedFileOwnerEntityType &&
                                      newFile.OwnerEntityType != ExternalApprovalProtocolFileOwnerEntityType;

        if (attachedToAnotherEntity)
        {
            throw new InvalidOperationException($"File '{newFile.FileName}' is already attached to '{newFile.OwnerEntityType}'.");
        }

        if (newFile.OwnerEntityType == ExternalApprovalProtocolFileOwnerEntityType &&
            newFile.OwnerEntityId != procedureId)
        {
            throw new InvalidOperationException($"File '{newFile.FileName}' is already attached to another procedure.");
        }

        newFile.OwnerEntityType = ExternalApprovalProtocolFileOwnerEntityType;
        newFile.OwnerEntityId = procedureId;
    }

    public async Task RebindOfferFilesAsync(
        Guid procedureId,
        IReadOnlyCollection<Guid> oldOfferFileIds,
        IReadOnlyCollection<Guid> newOfferFileIds,
        CancellationToken cancellationToken = default)
    {
        var oldFileIds = oldOfferFileIds.ToHashSet();
        var targetFileIds = newOfferFileIds.ToHashSet();

        if (oldFileIds.Count > 0)
        {
            var currentlyBound = await _dbContext.Set<StoredFile>()
                .Where(x =>
                    oldFileIds.Contains(x.Id) &&
                    x.OwnerEntityType == OfferFileOwnerEntityType &&
                    x.OwnerEntityId == procedureId)
                .ToListAsync(cancellationToken);

            foreach (var file in currentlyBound.Where(x => !targetFileIds.Contains(x.Id)))
            {
                file.OwnerEntityType = UnassignedFileOwnerEntityType;
                file.OwnerEntityId = Guid.Empty;
            }
        }

        if (targetFileIds.Count == 0)
        {
            return;
        }

        var filesToBind = await _dbContext.Set<StoredFile>()
            .Where(x => targetFileIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (filesToBind.Count != targetFileIds.Count)
        {
            var missing = targetFileIds.Where(x => filesToBind.All(f => f.Id != x)).ToArray();
            throw new ArgumentException($"Offer files not found: {string.Join(", ", missing)}");
        }

        foreach (var file in filesToBind)
        {
            var attachedToAnotherEntity = file.OwnerEntityType != UnassignedFileOwnerEntityType &&
                                          file.OwnerEntityType != OfferFileOwnerEntityType;
            if (attachedToAnotherEntity)
            {
                throw new InvalidOperationException($"File '{file.FileName}' is already attached to '{file.OwnerEntityType}'.");
            }

            if (file.OwnerEntityType == OfferFileOwnerEntityType && file.OwnerEntityId != procedureId)
            {
                throw new InvalidOperationException($"File '{file.FileName}' is already attached to another procedure.");
            }

            file.OwnerEntityType = OfferFileOwnerEntityType;
            file.OwnerEntityId = procedureId;
        }
    }

    public async Task RebindOutcomeProtocolAsync(
        Guid procedureId,
        Guid? oldProtocolFileId,
        Guid? newProtocolFileId,
        CancellationToken cancellationToken = default)
    {
        if (oldProtocolFileId.HasValue && oldProtocolFileId != newProtocolFileId)
        {
            var oldFile = await _dbContext.Set<StoredFile>()
                .FirstOrDefaultAsync(x => x.Id == oldProtocolFileId.Value, cancellationToken);

            if (oldFile is not null &&
                oldFile.OwnerEntityType == OutcomeProtocolFileOwnerEntityType &&
                oldFile.OwnerEntityId == procedureId)
            {
                oldFile.OwnerEntityType = UnassignedFileOwnerEntityType;
                oldFile.OwnerEntityId = Guid.Empty;
            }
        }

        if (!newProtocolFileId.HasValue)
        {
            return;
        }

        var newFile = await _dbContext.Set<StoredFile>()
            .FirstOrDefaultAsync(x => x.Id == newProtocolFileId.Value, cancellationToken);

        if (newFile is null)
        {
            throw new ArgumentException($"Outcome protocol file '{newProtocolFileId}' not found.", nameof(newProtocolFileId));
        }

        var attachedToAnotherEntity = newFile.OwnerEntityType != UnassignedFileOwnerEntityType &&
                                      newFile.OwnerEntityType != OutcomeProtocolFileOwnerEntityType;

        if (attachedToAnotherEntity)
        {
            throw new InvalidOperationException($"File '{newFile.FileName}' is already attached to '{newFile.OwnerEntityType}'.");
        }

        if (newFile.OwnerEntityType == OutcomeProtocolFileOwnerEntityType &&
            newFile.OwnerEntityId != procedureId)
        {
            throw new InvalidOperationException($"File '{newFile.FileName}' is already attached to another procedure.");
        }

        newFile.OwnerEntityType = OutcomeProtocolFileOwnerEntityType;
        newFile.OwnerEntityId = procedureId;
    }

    public async Task<ProcedureAttachmentDto[]> LoadRequestAttachmentsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Files
            .AsNoTracking()
            .Where(x => x.OwnerEntityType == RequestFileOwnerEntityType && x.OwnerEntityId == procedureId)
            .OrderBy(x => x.FileName)
            .Select(x => new ProcedureAttachmentDto(x.Id, x.FileName, x.ContentType, x.FileSizeBytes))
            .ToArrayAsync(cancellationToken);
    }

    private static HashSet<Guid> NormalizeAttachmentIds(IReadOnlyCollection<Guid>? ids)
    {
        return (ids ?? Array.Empty<Guid>())
            .Where(x => x != Guid.Empty)
            .ToHashSet();
    }
}
