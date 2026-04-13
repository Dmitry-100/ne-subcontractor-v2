using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureOffersWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ProcedureOffersWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProcedureOfferDto>> GetOffersAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        return await _dbContext.ProcedureOffers
            .AsNoTracking()
            .Include(x => x.Contractor)
            .Where(x => x.ProcedureId == procedureId)
            .OrderBy(x => x.DecisionStatus == ProcedureOfferDecisionStatus.Winner ? 0 : 1)
            .ThenBy(x => x.TotalAmount)
            .ThenBy(x => x.Contractor.Name)
            .Select(x => new ProcedureOfferDto(
                x.Id,
                x.ContractorId,
                x.Contractor.Name,
                x.OfferNumber,
                x.ReceivedDate,
                x.AmountWithoutVat,
                x.VatAmount,
                x.TotalAmount,
                x.DurationDays,
                x.CurrencyCode,
                x.QualificationStatus,
                x.DecisionStatus,
                x.OfferFileId,
                x.Notes))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureOfferDto>> UpsertOffersAsync(
        Guid procedureId,
        UpdateProcedureOffersRequest request,
        Func<Guid, IReadOnlyCollection<Guid>, IReadOnlyCollection<Guid>, CancellationToken, Task> rebindOfferFilesAsync,
        Func<ProcurementProcedure, ProcurementProcedureStatus, string, CancellationToken, Task<ProcurementProcedureStatusHistory>> updateProcedureStatusAsync,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(rebindOfferFilesAsync);
        ArgumentNullException.ThrowIfNull(updateProcedureStatusAsync);

        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.Status is ProcurementProcedureStatus.Created
            or ProcurementProcedureStatus.DocumentsPreparation
            or ProcurementProcedureStatus.OnApproval
            or ProcurementProcedureStatus.Canceled
            or ProcurementProcedureStatus.Completed)
        {
            throw new InvalidOperationException("Offers can be updated only after procedure is sent and before completion.");
        }

        var normalizedItems = ProcedureOfferNormalizationPolicy.Normalize(request.Items);
        var contractorIds = normalizedItems.Select(x => x.ContractorId).ToArray();
        if (contractorIds.Length > 0)
        {
            var contractorMap = await _dbContext.Set<Contractor>()
                .AsNoTracking()
                .Where(x => contractorIds.Contains(x.Id) && x.Status == ContractorStatus.Active)
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);

            if (contractorMap.Count != contractorIds.Length)
            {
                var missing = contractorIds.Where(id => contractorMap.All(x => x != id)).ToArray();
                throw new ArgumentException($"Unknown or inactive contractors in offers: {string.Join(", ", missing)}");
            }
        }

        var existingOffers = await _dbContext.Set<ProcedureOffer>()
            .Where(x => x.ProcedureId == procedureId)
            .ToListAsync(cancellationToken);

        var oldOfferFileIds = existingOffers
            .Where(x => x.OfferFileId.HasValue)
            .Select(x => x.OfferFileId!.Value)
            .ToHashSet();

        if (existingOffers.Count > 0)
        {
            _dbContext.Set<ProcedureOffer>().RemoveRange(existingOffers);
        }

        foreach (var item in normalizedItems)
        {
            await _dbContext.Set<ProcedureOffer>().AddAsync(new ProcedureOffer
            {
                ProcedureId = procedureId,
                ContractorId = item.ContractorId,
                OfferNumber = item.OfferNumber,
                ReceivedDate = item.ReceivedDate,
                AmountWithoutVat = item.AmountWithoutVat,
                VatAmount = item.VatAmount,
                TotalAmount = item.TotalAmount,
                DurationDays = item.DurationDays,
                CurrencyCode = item.CurrencyCode,
                QualificationStatus = item.QualificationStatus,
                DecisionStatus = item.DecisionStatus,
                OfferFileId = item.OfferFileId,
                Notes = item.Notes
            }, cancellationToken);
        }

        var newOfferFileIds = normalizedItems
            .Where(x => x.OfferFileId.HasValue)
            .Select(x => x.OfferFileId!.Value)
            .ToHashSet();

        await rebindOfferFilesAsync(procedureId, oldOfferFileIds, newOfferFileIds, cancellationToken);

        if (normalizedItems.Length > 0 &&
            procedure.Status is ProcurementProcedureStatus.Sent or ProcurementProcedureStatus.Retender)
        {
            var reason = procedure.Status == ProcurementProcedureStatus.Retender
                ? "Offers received after retender"
                : "Offers received";

            await updateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.OffersReceived,
                reason,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetOffersAsync(procedureId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureComparisonRowDto>> GetComparisonAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        var shortlistItems = await _dbContext.ProcedureShortlistItems
            .AsNoTracking()
            .Include(x => x.Contractor)
            .Where(x => x.ProcedureId == procedureId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Contractor.Name)
            .ToListAsync(cancellationToken);

        var offers = await _dbContext.ProcedureOffers
            .AsNoTracking()
            .Include(x => x.Contractor)
            .Where(x => x.ProcedureId == procedureId)
            .ToListAsync(cancellationToken);

        var offersByContractor = offers.ToDictionary(x => x.ContractorId, x => x);
        var rows = new List<ProcedureComparisonRowDto>(shortlistItems.Count + offers.Count);

        foreach (var shortlistItem in shortlistItems)
        {
            offersByContractor.TryGetValue(shortlistItem.ContractorId, out var offer);
            rows.Add(new ProcedureComparisonRowDto(
                shortlistItem.ContractorId,
                shortlistItem.Contractor.Name,
                shortlistItem.IsIncluded,
                shortlistItem.SortOrder,
                shortlistItem.ExclusionReason,
                offer?.Id,
                offer?.OfferNumber,
                offer?.ReceivedDate,
                offer?.AmountWithoutVat,
                offer?.VatAmount,
                offer?.TotalAmount,
                offer?.DurationDays,
                offer?.CurrencyCode,
                offer?.QualificationStatus,
                offer?.DecisionStatus,
                offer?.Notes));
        }

        var shortlistContractorIds = shortlistItems
            .Select(x => x.ContractorId)
            .ToHashSet();

        foreach (var offer in offers.Where(x => !shortlistContractorIds.Contains(x.ContractorId)))
        {
            rows.Add(new ProcedureComparisonRowDto(
                offer.ContractorId,
                offer.Contractor.Name,
                false,
                null,
                null,
                offer.Id,
                offer.OfferNumber,
                offer.ReceivedDate,
                offer.AmountWithoutVat,
                offer.VatAmount,
                offer.TotalAmount,
                offer.DurationDays,
                offer.CurrencyCode,
                offer.QualificationStatus,
                offer.DecisionStatus,
                offer.Notes));
        }

        return rows
            .OrderBy(x => x.IsShortlisted ? 0 : 1)
            .ThenBy(x => x.ShortlistSortOrder ?? int.MaxValue)
            .ThenBy(x => x.ContractorName)
            .ToArray();
    }

    private async Task<ProcurementProcedure> EnsureProcedureExistsAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == procedureId, cancellationToken);

        return procedure ?? throw new KeyNotFoundException($"Procedure '{procedureId}' not found.");
    }
}
