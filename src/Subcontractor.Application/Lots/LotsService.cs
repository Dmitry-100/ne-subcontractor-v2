using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

public sealed class LotsService : ILotsService
{
    private readonly IApplicationDbContext _dbContext;

    public LotsService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<LotListItemDto>> ListAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Lots
            .AsNoTracking()
            .Include(x => x.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x => x.Code.Contains(normalizedSearch) || x.Name.Contains(normalizedSearch));
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(x => x.Items.Any(i => i.ProjectId == projectId.Value));
        }

        return await query
            .OrderBy(x => x.Code)
            .Select(x => new LotListItemDto(
                x.Id,
                x.Code,
                x.Name,
                x.Status,
                x.ResponsibleCommercialUserId,
                x.Items.Count,
                x.Items.Sum(i => i.ManHours)))
            .ToListAsync(cancellationToken);
    }

    public async Task<LotDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var lot = await _dbContext.Set<Lot>()
            .AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return lot is null ? null : ToDetailsDto(lot);
    }

    public async Task<LotDetailsDto> CreateAsync(CreateLotRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizeCode(request.Code);
        var normalizedName = NormalizeName(request.Name);
        var normalizedItems = NormalizeItems(request.Items);

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
            lot.Items.Add(ToEntity(item));
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
        return ToDetailsDto(lot);
    }

    public async Task<LotDetailsDto?> UpdateAsync(Guid id, UpdateLotRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedName = NormalizeName(request.Name);
        var normalizedItems = NormalizeItems(request.Items);

        var lot = await _dbContext.Set<Lot>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (lot is null)
        {
            return null;
        }

        lot.Name = normalizedName;
        lot.ResponsibleCommercialUserId = request.ResponsibleCommercialUserId;

        var existingItems = lot.Items.ToArray();
        if (existingItems.Length > 0)
        {
            _dbContext.Set<LotItem>().RemoveRange(existingItems);
            lot.Items.Clear();
        }

        foreach (var item in normalizedItems)
        {
            lot.Items.Add(ToEntity(item));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDetailsDto(lot);
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

        EnsureTransitionAllowed(lot.Status, request.TargetStatus, request.Reason);
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

        return ToHistoryDto(history);
    }

    public async Task<IReadOnlyList<LotStatusHistoryItemDto>> GetHistoryAsync(Guid lotId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.LotStatusHistory
            .AsNoTracking()
            .Where(x => x.LotId == lotId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new LotStatusHistoryItemDto(
                x.Id,
                x.FromStatus,
                x.ToStatus,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    private static void EnsureTransitionAllowed(LotStatus current, LotStatus target, string? reason)
    {
        if ((int)target > (int)current)
        {
            if ((int)target - (int)current != 1)
            {
                throw new InvalidOperationException($"Forward transition {current} -> {target} is not allowed.");
            }

            return;
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("Rollback reason is required.", nameof(reason));
        }
    }

    private static string NormalizeCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Lot code is required.", nameof(code));
        }

        return code.Trim();
    }

    private static string NormalizeName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Lot name is required.", nameof(name));
        }

        return name.Trim();
    }

    private static NormalizedLotItem[] NormalizeItems(IReadOnlyCollection<UpsertLotItemRequest>? items)
    {
        return (items ?? Array.Empty<UpsertLotItemRequest>())
            .Select((item, index) => NormalizeItem(item, index))
            .ToArray();
    }

    private static NormalizedLotItem NormalizeItem(UpsertLotItemRequest item, int index)
    {
        if (item.ProjectId == Guid.Empty)
        {
            throw new ArgumentException($"Item #{index + 1}: projectId is required.", nameof(item.ProjectId));
        }

        if (string.IsNullOrWhiteSpace(item.ObjectWbs))
        {
            throw new ArgumentException($"Item #{index + 1}: objectWbs is required.", nameof(item.ObjectWbs));
        }

        if (string.IsNullOrWhiteSpace(item.DisciplineCode))
        {
            throw new ArgumentException($"Item #{index + 1}: disciplineCode is required.", nameof(item.DisciplineCode));
        }

        if (item.ManHours < 0)
        {
            throw new ArgumentException($"Item #{index + 1}: manHours must be non-negative.", nameof(item.ManHours));
        }

        if (item.PlannedStartDate.HasValue &&
            item.PlannedFinishDate.HasValue &&
            item.PlannedStartDate.Value.Date > item.PlannedFinishDate.Value.Date)
        {
            throw new ArgumentException(
                $"Item #{index + 1}: plannedStartDate must be <= plannedFinishDate.",
                nameof(item.PlannedStartDate));
        }

        return new NormalizedLotItem(
            item.ProjectId,
            item.ObjectWbs.Trim(),
            item.DisciplineCode.Trim().ToUpperInvariant(),
            item.ManHours,
            item.PlannedStartDate,
            item.PlannedFinishDate);
    }

    private static LotItem ToEntity(NormalizedLotItem item)
    {
        return new LotItem
        {
            ProjectId = item.ProjectId,
            ObjectWbs = item.ObjectWbs,
            DisciplineCode = item.DisciplineCode,
            ManHours = item.ManHours,
            PlannedStartDate = item.PlannedStartDate,
            PlannedFinishDate = item.PlannedFinishDate
        };
    }

    private static LotDetailsDto ToDetailsDto(Lot lot)
    {
        return new LotDetailsDto(
            lot.Id,
            lot.Code,
            lot.Name,
            lot.Status,
            lot.ResponsibleCommercialUserId,
            lot.Items
                .OrderBy(x => x.ObjectWbs)
                .ThenBy(x => x.DisciplineCode)
                .Select(x => new LotItemDto(
                    x.Id,
                    x.ProjectId,
                    x.ObjectWbs,
                    x.DisciplineCode,
                    x.ManHours,
                    x.PlannedStartDate,
                    x.PlannedFinishDate))
                .ToArray());
    }

    private static LotStatusHistoryItemDto ToHistoryDto(LotStatusHistory history)
    {
        return new LotStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
    }

    private sealed record NormalizedLotItem(
        Guid ProjectId,
        string ObjectWbs,
        string DisciplineCode,
        decimal ManHours,
        DateTime? PlannedStartDate,
        DateTime? PlannedFinishDate);
}
