using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureLifecycleService
{
    private const int DefaultPageSize = 15;
    private const int MaxPageSize = 200;

    private readonly IApplicationDbContext _dbContext;
    private readonly ProcedureAttachmentBindingService _attachmentBindingService;

    public ProcedureLifecycleService(
        IApplicationDbContext dbContext,
        ProcedureAttachmentBindingService attachmentBindingService)
    {
        _dbContext = dbContext;
        _attachmentBindingService = attachmentBindingService;
    }

    public async Task<IReadOnlyList<ProcedureListItemDto>> ListAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        CancellationToken cancellationToken = default)
    {
        var query = BuildFilteredQuery(search, status, lotId);
        return await ProjectListItems(query).ToListAsync(cancellationToken);
    }

    public async Task<ProcedureListPageDto> ListPageAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        var normalizedSkip = skip < 0 ? 0 : skip;
        var normalizedTake = take <= 0 ? DefaultPageSize : Math.Min(take, MaxPageSize);

        var query = BuildFilteredQuery(search, status, lotId);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await ProjectListItems(query)
            .Skip(normalizedSkip)
            .Take(normalizedTake)
            .ToListAsync(cancellationToken);

        return new ProcedureListPageDto(items, totalCount, normalizedSkip, normalizedTake);
    }

    public async Task<ProcedureDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (procedure is null)
        {
            return null;
        }

        var attachments = await _attachmentBindingService.LoadRequestAttachmentsAsync(procedure.Id, cancellationToken);
        return ToDetailsDto(procedure, attachments);
    }

    public async Task<ProcedureDetailsDto> CreateAsync(
        CreateProcedureRequest request,
        CancellationToken cancellationToken = default)
    {
        ProcedureRequestValidationPolicy.Validate(request);

        if (request.LotId == Guid.Empty)
        {
            throw new ArgumentException("LotId is required.", nameof(request.LotId));
        }

        var lot = await _dbContext.Set<Lot>()
            .FirstOrDefaultAsync(x => x.Id == request.LotId, cancellationToken);

        if (lot is null)
        {
            throw new ArgumentException("Lot does not exist.", nameof(request.LotId));
        }

        if (lot.Status != LotStatus.InProcurement)
        {
            throw new InvalidOperationException("Procedure can be created only for lots in 'InProcurement' status.");
        }

        var exists = await _dbContext.Procedures
            .AnyAsync(x => x.LotId == request.LotId, cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException("Procedure already exists for this lot.");
        }

        var procedure = new ProcurementProcedure
        {
            LotId = request.LotId,
            Status = ProcurementProcedureStatus.Created
        };

        ProcedureRequestMappingPolicy.Apply(procedure, request);

        await _dbContext.Set<ProcurementProcedure>().AddAsync(procedure, cancellationToken);
        await _dbContext.Set<ProcurementProcedureStatusHistory>().AddAsync(new ProcurementProcedureStatusHistory
        {
            Procedure = procedure,
            FromStatus = null,
            ToStatus = ProcurementProcedureStatus.Created,
            Reason = "Procedure created"
        }, cancellationToken);

        await _attachmentBindingService.RebindRequestAttachmentsAsync(procedure.Id, request.AttachmentFileIds, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var attachments = await _attachmentBindingService.LoadRequestAttachmentsAsync(procedure.Id, cancellationToken);
        return ToDetailsDto(procedure, attachments);
    }

    public async Task<ProcedureDetailsDto?> UpdateAsync(
        Guid id,
        UpdateProcedureRequest request,
        CancellationToken cancellationToken = default)
    {
        ProcedureRequestValidationPolicy.Validate(request);

        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (procedure is null)
        {
            return null;
        }

        ProcedureRequestMappingPolicy.Apply(procedure, request);
        await _attachmentBindingService.RebindRequestAttachmentsAsync(procedure.Id, request.AttachmentFileIds, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var attachments = await _attachmentBindingService.LoadRequestAttachmentsAsync(procedure.Id, cancellationToken);
        return ToDetailsDto(procedure, attachments);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (procedure is null)
        {
            return false;
        }

        if (procedure.Status is not (ProcurementProcedureStatus.Created or ProcurementProcedureStatus.DocumentsPreparation or ProcurementProcedureStatus.Canceled))
        {
            throw new InvalidOperationException("Only draft/canceled procedures can be deleted.");
        }

        _dbContext.Set<ProcurementProcedure>().Remove(procedure);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<ProcedureStatusHistoryItemDto>> GetHistoryAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ProcedureStatusHistory
            .AsNoTracking()
            .Where(x => x.ProcedureId == procedureId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ProcedureStatusHistoryItemDto(
                x.Id,
                x.FromStatus,
                x.ToStatus,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    private IQueryable<ProcurementProcedure> BuildFilteredQuery(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId)
    {
        var query = _dbContext.Procedures.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.ObjectName.Contains(normalizedSearch) ||
                x.PurchaseTypeCode.Contains(normalizedSearch) ||
                x.WorkScope.Contains(normalizedSearch));
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (lotId.HasValue)
        {
            query = query.Where(x => x.LotId == lotId.Value);
        }

        return query;
    }

    private static IQueryable<ProcedureListItemDto> ProjectListItems(IQueryable<ProcurementProcedure> query)
    {
        return query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ProcedureListItemDto(
                x.Id,
                x.LotId,
                x.Status,
                x.PurchaseTypeCode,
                x.ObjectName,
                x.InitiatorUserId,
                x.ResponsibleCommercialUserId,
                x.RequiredSubcontractorDeadline,
                x.ApprovalMode));
    }

    private static ProcedureDetailsDto ToDetailsDto(ProcurementProcedure entity, IReadOnlyCollection<ProcedureAttachmentDto> attachments)
    {
        return new ProcedureDetailsDto(
            entity.Id,
            entity.LotId,
            entity.Status,
            entity.RequestDate,
            entity.PurchaseTypeCode,
            entity.InitiatorUserId,
            entity.ResponsibleCommercialUserId,
            entity.ObjectName,
            entity.WorkScope,
            entity.CustomerName,
            entity.LeadOfficeCode,
            entity.AnalyticsLevel1Code,
            entity.AnalyticsLevel2Code,
            entity.AnalyticsLevel3Code,
            entity.AnalyticsLevel4Code,
            entity.AnalyticsLevel5Code,
            entity.CustomerContractNumber,
            entity.CustomerContractDate,
            entity.RequiredSubcontractorDeadline,
            entity.ProposalDueDate,
            entity.PlannedBudgetWithoutVat,
            entity.Notes,
            entity.ApprovalMode,
            entity.ApprovalRouteCode,
            entity.ContainsConfidentialInfo,
            entity.RequiresTechnicalNegotiations,
            attachments);
    }
}
