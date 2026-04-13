using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureExternalApprovalWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ProcedureExternalApprovalWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ProcedureExternalApprovalDto> GetExternalApprovalAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        var entity = await _dbContext.ProcedureExternalApprovals
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProcedureId == procedureId, cancellationToken);

        return entity is null
            ? new ProcedureExternalApprovalDto(null, null, null, null, null, null)
            : ToExternalApprovalDto(entity);
    }

    public async Task<ProcedureExternalApprovalDto> UpsertExternalApprovalAsync(
        Guid procedureId,
        UpsertProcedureExternalApprovalRequest request,
        Func<Guid, Guid?, Guid?, CancellationToken, Task> rebindExternalApprovalProtocolAsync,
        Func<ProcurementProcedure, ProcurementProcedureStatus, string, CancellationToken, Task<ProcurementProcedureStatusHistory>> updateProcedureStatusAsync,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(rebindExternalApprovalProtocolAsync);
        ArgumentNullException.ThrowIfNull(updateProcedureStatusAsync);

        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.ApprovalMode != ProcedureApprovalMode.External)
        {
            throw new InvalidOperationException("External approval is allowed only for external approval mode.");
        }

        if (procedure.Status != ProcurementProcedureStatus.OnApproval)
        {
            throw new InvalidOperationException("External approval result can be recorded only in 'OnApproval' status.");
        }

        var entity = await _dbContext.Set<ProcedureExternalApproval>()
            .FirstOrDefaultAsync(x => x.ProcedureId == procedureId, cancellationToken);

        if (entity is null)
        {
            entity = new ProcedureExternalApproval
            {
                ProcedureId = procedureId
            };
            await _dbContext.Set<ProcedureExternalApproval>().AddAsync(entity, cancellationToken);
        }

        var normalizedProtocolFileId = NormalizeOptionalGuid(request.ProtocolFileId);
        await rebindExternalApprovalProtocolAsync(
            procedureId,
            entity.ProtocolFileId,
            normalizedProtocolFileId,
            cancellationToken);

        entity.IsApproved = request.IsApproved;
        entity.DecisionDate = request.DecisionDate;
        entity.ResponsibleUserId = request.ResponsibleUserId;
        entity.ProtocolFileId = normalizedProtocolFileId;
        entity.Comment = NormalizeOptionalText(request.Comment);

        if (request.IsApproved == true)
        {
            await updateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.Sent,
                entity.Comment ?? "External approval approved",
                cancellationToken);
        }
        else if (request.IsApproved == false)
        {
            if (string.IsNullOrWhiteSpace(entity.Comment))
            {
                throw new ArgumentException("Comment is required when external approval is negative.", nameof(request.Comment));
            }

            await updateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.DocumentsPreparation,
                entity.Comment,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToExternalApprovalDto(entity);
    }

    private async Task<ProcurementProcedure> EnsureProcedureExistsAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == procedureId, cancellationToken);

        return procedure ?? throw new KeyNotFoundException($"Procedure '{procedureId}' not found.");
    }

    private static Guid? NormalizeOptionalGuid(Guid? value)
    {
        return value.HasValue && value.Value != Guid.Empty ? value : null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static ProcedureExternalApprovalDto ToExternalApprovalDto(ProcedureExternalApproval entity)
    {
        return new ProcedureExternalApprovalDto(
            entity.Id,
            entity.IsApproved,
            entity.DecisionDate,
            entity.ResponsibleUserId,
            entity.ProtocolFileId,
            entity.Comment);
    }
}
