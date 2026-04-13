using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

public sealed class LotWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public LotWriteWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LotDetailsDto> CreateAsync(CreateLotRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedCode = LotMutationPolicy.NormalizeCode(request.Code);
        var normalizedName = LotMutationPolicy.NormalizeName(request.Name);
        var normalizedItems = LotMutationPolicy.NormalizeItems(request.Items);

        var exists = await _dbContext.Lots.AnyAsync(x => x.Code == normalizedCode, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Lot with code '{normalizedCode}' already exists.");
        }

        var lot = new Lot
        {
            Code = normalizedCode,
            Name = normalizedName,
            ResponsibleCommercialUserId = request.ResponsibleCommercialUserId,
            Status = LotStatus.Draft
        };

        foreach (var item in normalizedItems)
        {
            lot.Items.Add(LotMutationPolicy.ToEntity(item));
        }

        await _dbContext.Set<Lot>().AddAsync(lot, cancellationToken);
        await _dbContext.Set<LotStatusHistory>().AddAsync(new LotStatusHistory
        {
            Lot = lot,
            FromStatus = null,
            ToStatus = LotStatus.Draft,
            Reason = "Lot created"
        }, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return LotReadProjectionPolicy.ToDetailsDto(lot);
    }

    public async Task<LotDetailsDto?> UpdateAsync(Guid id, UpdateLotRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedName = LotMutationPolicy.NormalizeName(request.Name);
        var normalizedItems = LotMutationPolicy.NormalizeItems(request.Items);

        var lot = await _dbContext.Set<Lot>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (lot is null)
        {
            return null;
        }

        lot.Name = normalizedName;
        lot.ResponsibleCommercialUserId = request.ResponsibleCommercialUserId;

        var existingItems = await _dbContext.Set<LotItem>()
            .Where(x => x.LotId == lot.Id)
            .ToListAsync(cancellationToken);
        if (existingItems.Count > 0)
        {
            _dbContext.Set<LotItem>().RemoveRange(existingItems);
        }

        foreach (var item in normalizedItems)
        {
            var lotItem = LotMutationPolicy.ToEntity(item);
            lotItem.LotId = lot.Id;
            await _dbContext.Set<LotItem>().AddAsync(lotItem, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var reloaded = await _dbContext.Set<Lot>()
            .AsNoTracking()
            .Include(x => x.Items)
            .FirstAsync(x => x.Id == lot.Id, cancellationToken);
        return LotReadProjectionPolicy.ToDetailsDto(reloaded);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var lot = await _dbContext.Set<Lot>().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (lot is null)
        {
            return false;
        }

        _dbContext.Set<Lot>().Remove(lot);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<LotStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        LotStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        var lot = await _dbContext.Set<Lot>().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (lot is null)
        {
            return null;
        }

        if (lot.Status == request.TargetStatus)
        {
            throw new ArgumentException("Target status must differ from current status.", nameof(request.TargetStatus));
        }

        LotTransitionPolicy.EnsureTransitionAllowed(lot.Status, request.TargetStatus, request.Reason);
        var reason = request.Reason?.Trim() ?? string.Empty;

        var history = new LotStatusHistory
        {
            LotId = lot.Id,
            FromStatus = lot.Status,
            ToStatus = request.TargetStatus,
            Reason = reason
        };

        lot.Status = request.TargetStatus;
        await _dbContext.Set<LotStatusHistory>().AddAsync(history, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return LotReadProjectionPolicy.ToHistoryDto(history);
    }
}
