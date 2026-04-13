using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureOutcomeWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ProcedureOutcomeWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ProcedureOutcomeDto> GetOutcomeAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        var entity = await _dbContext.ProcedureOutcomes
            .AsNoTracking()
            .Include(x => x.WinnerContractor)
            .FirstOrDefaultAsync(x => x.ProcedureId == procedureId, cancellationToken);

        return entity is null
            ? new ProcedureOutcomeDto(null, null, null, null, null, false, null, null)
            : ToOutcomeDto(entity);
    }

    public async Task<ProcedureOutcomeDto> UpsertOutcomeAsync(
        Guid procedureId,
        UpdateProcedureOutcomeRequest request,
        Func<Guid, Guid?, Guid?, CancellationToken, Task> rebindOutcomeProtocolAsync,
        Func<ProcurementProcedure, ProcurementProcedureStatus, string, CancellationToken, Task<ProcurementProcedureStatusHistory>> updateProcedureStatusAsync,
        Func<Guid, LotStatus, string, CancellationToken, Task> syncLotStatusAsync,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(rebindOutcomeProtocolAsync);
        ArgumentNullException.ThrowIfNull(updateProcedureStatusAsync);
        ArgumentNullException.ThrowIfNull(syncLotStatusAsync);

        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.Status is ProcurementProcedureStatus.Created
            or ProcurementProcedureStatus.DocumentsPreparation
            or ProcurementProcedureStatus.OnApproval
            or ProcurementProcedureStatus.Sent
            or ProcurementProcedureStatus.Canceled
            or ProcurementProcedureStatus.Completed)
        {
            throw new InvalidOperationException("Outcome can be recorded only after offers are received and before completion.");
        }

        var winnerContractorId = NormalizeOptionalGuid(request.WinnerContractorId);
        var cancellationReason = NormalizeOptionalText(request.CancellationReason);
        var comment = NormalizeOptionalText(request.Comment);
        var normalizedProtocolFileId = NormalizeOptionalGuid(request.ProtocolFileId);

        if (request.IsCanceled)
        {
            if (string.IsNullOrWhiteSpace(cancellationReason))
            {
                throw new ArgumentException("CancellationReason is required when outcome is marked as canceled.", nameof(request.CancellationReason));
            }

            winnerContractorId = null;

            var winnerOffers = await _dbContext.Set<ProcedureOffer>()
                .Where(x => x.ProcedureId == procedureId && x.DecisionStatus == ProcedureOfferDecisionStatus.Winner)
                .ToListAsync(cancellationToken);

            foreach (var offer in winnerOffers)
            {
                offer.DecisionStatus = ProcedureOfferDecisionStatus.Rejected;
            }
        }
        else if (!winnerContractorId.HasValue)
        {
            throw new ArgumentException("WinnerContractorId is required for non-canceled outcome.", nameof(request.WinnerContractorId));
        }

        if (winnerContractorId.HasValue)
        {
            var winnerContractor = await _dbContext.Set<Contractor>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == winnerContractorId.Value, cancellationToken);

            if (winnerContractor is null || winnerContractor.Status != ContractorStatus.Active)
            {
                throw new ArgumentException($"Winner contractor '{winnerContractorId}' does not exist or is inactive.");
            }

            var offers = await _dbContext.Set<ProcedureOffer>()
                .Where(x => x.ProcedureId == procedureId)
                .ToListAsync(cancellationToken);

            if (offers.All(x => x.ContractorId != winnerContractorId.Value))
            {
                throw new ArgumentException("Winner contractor must have an offer in this procedure.", nameof(request.WinnerContractorId));
            }

            foreach (var offer in offers)
            {
                offer.DecisionStatus = offer.ContractorId == winnerContractorId.Value
                    ? ProcedureOfferDecisionStatus.Winner
                    : offer.DecisionStatus == ProcedureOfferDecisionStatus.Winner
                        ? ProcedureOfferDecisionStatus.Rejected
                        : offer.DecisionStatus;
            }
        }

        var entity = await _dbContext.Set<ProcedureOutcome>()
            .Include(x => x.WinnerContractor)
            .FirstOrDefaultAsync(x => x.ProcedureId == procedureId, cancellationToken);

        if (entity is null)
        {
            entity = new ProcedureOutcome
            {
                ProcedureId = procedureId
            };
            await _dbContext.Set<ProcedureOutcome>().AddAsync(entity, cancellationToken);
        }

        await rebindOutcomeProtocolAsync(
            procedureId,
            entity.ProtocolFileId,
            normalizedProtocolFileId,
            cancellationToken);

        entity.WinnerContractorId = winnerContractorId;
        entity.DecisionDate = request.DecisionDate;
        entity.ProtocolFileId = normalizedProtocolFileId;
        entity.IsCanceled = request.IsCanceled;
        entity.CancellationReason = request.IsCanceled ? cancellationReason : null;
        entity.Comment = comment;

        if (request.IsCanceled)
        {
            await updateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.Retender,
                cancellationReason!,
                cancellationToken);

            await syncLotStatusAsync(
                procedure.LotId,
                LotStatus.InProcurement,
                "Procedure returned to retender stage",
                cancellationToken);
        }
        else
        {
            await updateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.DecisionMade,
                comment ?? "Winner selected",
                cancellationToken);

            await syncLotStatusAsync(
                procedure.LotId,
                LotStatus.ContractorSelected,
                "Winner selected in procurement procedure",
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        entity = await _dbContext.Set<ProcedureOutcome>()
            .AsNoTracking()
            .Include(x => x.WinnerContractor)
            .FirstAsync(x => x.ProcedureId == procedureId, cancellationToken);

        return ToOutcomeDto(entity);
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

    private static ProcedureOutcomeDto ToOutcomeDto(ProcedureOutcome entity)
    {
        return new ProcedureOutcomeDto(
            entity.Id,
            entity.WinnerContractorId,
            entity.WinnerContractor?.Name,
            entity.DecisionDate,
            entity.ProtocolFileId,
            entity.IsCanceled,
            entity.CancellationReason,
            entity.Comment);
    }
}
