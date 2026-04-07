using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Contracts;

public sealed class ContractsService : IContractsService
{
    private readonly IApplicationDbContext _dbContext;

    public ContractsService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ContractListItemDto>> ListAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Contracts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x => x.ContractNumber.Contains(normalizedSearch));
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (lotId.HasValue)
        {
            query = query.Where(x => x.LotId == lotId.Value);
        }

        if (procedureId.HasValue)
        {
            query = query.Where(x => x.ProcedureId == procedureId.Value);
        }

        if (contractorId.HasValue)
        {
            query = query.Where(x => x.ContractorId == contractorId.Value);
        }

        var contracts = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var contractorNames = await ResolveContractorNamesAsync(
            contracts.Select(x => x.ContractorId).Distinct().ToArray(),
            cancellationToken);

        return contracts
            .Select(x => ToListItemDto(x, contractorNames.TryGetValue(x.ContractorId, out var name) ? name : null))
            .ToArray();
    }

    public async Task<ContractDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contract = await _dbContext.Set<Contract>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contract is null)
        {
            return null;
        }

        var contractorName = await ResolveContractorNameAsync(contract.ContractorId, cancellationToken);
        return ToDetailsDto(contract, contractorName);
    }

    public async Task<ContractDetailsDto> CreateAsync(CreateContractRequest request, CancellationToken cancellationToken = default)
    {
        ValidateCreateRequest(request);

        var contractNumber = request.ContractNumber.Trim();
        await EnsureContractNumberAvailableAsync(contractNumber, null, cancellationToken);
        await EnsureProcedureContractAvailableAsync(request.ProcedureId, null, cancellationToken);

        var lot = await _dbContext.Set<Lot>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.LotId, cancellationToken);
        if (lot is null)
        {
            throw new ArgumentException($"Lot '{request.LotId}' does not exist.", nameof(request.LotId));
        }

        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ProcedureId, cancellationToken);
        if (procedure is null)
        {
            throw new ArgumentException($"Procedure '{request.ProcedureId}' does not exist.", nameof(request.ProcedureId));
        }

        if (procedure.LotId != request.LotId)
        {
            throw new InvalidOperationException("Procedure does not belong to the specified lot.");
        }

        if (procedure.Status is not (ProcurementProcedureStatus.DecisionMade or ProcurementProcedureStatus.Completed))
        {
            throw new InvalidOperationException("Contract can be created only for procedures in DecisionMade/Completed statuses.");
        }

        var contractor = await _dbContext.Set<Contractor>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ContractorId, cancellationToken);
        if (contractor is null || contractor.Status != ContractorStatus.Active)
        {
            throw new ArgumentException($"Contractor '{request.ContractorId}' does not exist or is inactive.", nameof(request.ContractorId));
        }

        var outcome = await _dbContext.Set<ProcedureOutcome>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProcedureId == request.ProcedureId, cancellationToken);

        if (outcome is not null &&
            !outcome.IsCanceled &&
            outcome.WinnerContractorId.HasValue &&
            outcome.WinnerContractorId.Value != request.ContractorId)
        {
            throw new InvalidOperationException("Contractor must match winner selected in procedure outcome.");
        }

        var contract = new Contract
        {
            LotId = request.LotId,
            ProcedureId = request.ProcedureId,
            ContractorId = request.ContractorId,
            ContractNumber = contractNumber,
            SigningDate = request.SigningDate,
            AmountWithoutVat = request.AmountWithoutVat,
            VatAmount = request.VatAmount,
            TotalAmount = request.TotalAmount,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = request.Status
        };

        await _dbContext.Set<Contract>().AddAsync(contract, cancellationToken);
        await _dbContext.Set<ContractStatusHistory>().AddAsync(new ContractStatusHistory
        {
            Contract = contract,
            FromStatus = null,
            ToStatus = contract.Status,
            Reason = "Contract created"
        }, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDetailsDto(contract, contractor.Name);
    }

    public async Task<ContractDetailsDto?> UpdateAsync(Guid id, UpdateContractRequest request, CancellationToken cancellationToken = default)
    {
        ValidateUpdateRequest(request);

        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contract is null)
        {
            return null;
        }

        var contractNumber = request.ContractNumber.Trim();
        await EnsureContractNumberAvailableAsync(contractNumber, contract.Id, cancellationToken);

        if (request.Status != contract.Status)
        {
            throw new InvalidOperationException("Status cannot be changed via update API. Use transition endpoint.");
        }

        contract.ContractNumber = contractNumber;
        contract.SigningDate = request.SigningDate;
        contract.AmountWithoutVat = request.AmountWithoutVat;
        contract.VatAmount = request.VatAmount;
        contract.TotalAmount = request.TotalAmount;
        contract.StartDate = request.StartDate;
        contract.EndDate = request.EndDate;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var contractorName = await ResolveContractorNameAsync(contract.ContractorId, cancellationToken);
        return ToDetailsDto(contract, contractorName);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contract is null)
        {
            return false;
        }

        _dbContext.Set<Contract>().Remove(contract);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ContractStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        ContractStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (contract is null)
        {
            return null;
        }

        if (contract.Status == request.TargetStatus)
        {
            throw new ArgumentException("Target status must differ from current status.", nameof(request.TargetStatus));
        }

        EnsureTransitionAllowed(contract.Status, request.TargetStatus, request.Reason);
        EnsureTransitionStateData(contract, request.TargetStatus);
        if (request.TargetStatus == ContractStatus.Closed)
        {
            await EnsureNoOverdueMilestonesBeforeCloseAsync(contract.Id, cancellationToken);
        }

        var reason = request.Reason?.Trim() ?? string.Empty;
        var history = new ContractStatusHistory
        {
            ContractId = contract.Id,
            FromStatus = contract.Status,
            ToStatus = request.TargetStatus,
            Reason = reason
        };

        contract.Status = request.TargetStatus;
        await _dbContext.Set<ContractStatusHistory>().AddAsync(history, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToHistoryDto(history);
    }

    public async Task<IReadOnlyList<ContractStatusHistoryItemDto>> GetHistoryAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ContractStatusHistory
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ContractStatusHistoryItemDto(
                x.Id,
                x.FromStatus,
                x.ToStatus,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<ContractExecutionSummaryDto> GetExecutionSummaryAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        await EnsureContractExistsAsync(contractId, cancellationToken);
        return await BuildExecutionSummaryAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMilestoneDto>> GetMilestonesAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        await EnsureContractExistsAsync(contractId, cancellationToken);

        var utcToday = DateTime.UtcNow.Date;
        var milestones = await _dbContext.ContractMilestones
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.PlannedDate)
            .ThenBy(x => x.Title)
            .ToListAsync(cancellationToken);

        return milestones
            .Select(x => ToMilestoneDto(x, utcToday))
            .ToArray();
    }

    public async Task<IReadOnlyList<ContractMilestoneDto>> UpsertMilestonesAsync(
        Guid contractId,
        UpdateContractMilestonesRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == contractId, cancellationToken);
        if (contract is null)
        {
            throw new KeyNotFoundException($"Contract '{contractId}' was not found.");
        }

        if (contract.Status is not (ContractStatus.Signed or ContractStatus.Active))
        {
            throw new InvalidOperationException("Milestones can be edited only for Signed or Active contracts.");
        }

        var normalizedItems = NormalizeMilestoneItems(request.Items);
        var existingMilestones = await _dbContext.Set<ContractMilestone>()
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);
        if (existingMilestones.Count > 0)
        {
            _dbContext.Set<ContractMilestone>().RemoveRange(existingMilestones);
        }

        foreach (var item in normalizedItems)
        {
            await _dbContext.Set<ContractMilestone>().AddAsync(new ContractMilestone
            {
                ContractId = contractId,
                Title = item.Title,
                PlannedDate = item.PlannedDate,
                ActualDate = item.ActualDate,
                ProgressPercent = item.ProgressPercent,
                SortOrder = item.SortOrder,
                Notes = item.Notes
            }, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetMilestonesAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMonitoringControlPointDto>> GetMonitoringControlPointsAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        await EnsureContractExistsAsync(contractId, cancellationToken);

        var controlPoints = await _dbContext.ContractMonitoringControlPoints
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .Include(x => x.Stages)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.PlannedDate)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var utcToday = DateTime.UtcNow.Date;
        return controlPoints
            .Select(x => ToControlPointDto(x, utcToday))
            .ToArray();
    }

    public async Task<IReadOnlyList<ContractMonitoringControlPointDto>> UpsertMonitoringControlPointsAsync(
        Guid contractId,
        UpdateContractMonitoringControlPointsRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == contractId, cancellationToken);
        if (contract is null)
        {
            throw new KeyNotFoundException($"Contract '{contractId}' was not found.");
        }

        if (contract.Status is not (ContractStatus.Signed or ContractStatus.Active))
        {
            throw new InvalidOperationException("Monitoring control points can be edited only for Signed or Active contracts.");
        }

        var normalizedItems = NormalizeControlPointItems(request.Items);
        var existingControlPoints = await _dbContext.Set<ContractMonitoringControlPoint>()
            .Include(x => x.Stages)
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);
        if (existingControlPoints.Count > 0)
        {
            _dbContext.Set<ContractMonitoringControlPointStage>().RemoveRange(existingControlPoints.SelectMany(x => x.Stages));
            _dbContext.Set<ContractMonitoringControlPoint>().RemoveRange(existingControlPoints);
        }

        foreach (var item in normalizedItems)
        {
            var controlPoint = new ContractMonitoringControlPoint
            {
                ContractId = contractId,
                Name = item.Name,
                ResponsibleRole = item.ResponsibleRole,
                PlannedDate = item.PlannedDate,
                ForecastDate = item.ForecastDate,
                ActualDate = item.ActualDate,
                ProgressPercent = item.ProgressPercent,
                SortOrder = item.SortOrder,
                Notes = item.Notes
            };

            foreach (var stage in item.Stages)
            {
                controlPoint.Stages.Add(new ContractMonitoringControlPointStage
                {
                    Name = stage.Name,
                    PlannedDate = stage.PlannedDate,
                    ForecastDate = stage.ForecastDate,
                    ActualDate = stage.ActualDate,
                    ProgressPercent = stage.ProgressPercent,
                    SortOrder = stage.SortOrder,
                    Notes = stage.Notes
                });
            }

            await _dbContext.Set<ContractMonitoringControlPoint>().AddAsync(controlPoint, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetMonitoringControlPointsAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMdrCardDto>> GetMdrCardsAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        await EnsureContractExistsAsync(contractId, cancellationToken);

        var cards = await _dbContext.ContractMdrCards
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .Include(x => x.Rows)
            .OrderBy(x => x.SortOrder)
            .ThenByDescending(x => x.ReportingDate)
            .ThenBy(x => x.Title)
            .ToListAsync(cancellationToken);

        return cards
            .Select(ToMdrCardDto)
            .ToArray();
    }

    public async Task<IReadOnlyList<ContractMdrCardDto>> UpsertMdrCardsAsync(
        Guid contractId,
        UpdateContractMdrCardsRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == contractId, cancellationToken);
        if (contract is null)
        {
            throw new KeyNotFoundException($"Contract '{contractId}' was not found.");
        }

        if (contract.Status is not (ContractStatus.Signed or ContractStatus.Active))
        {
            throw new InvalidOperationException("MDR cards can be edited only for Signed or Active contracts.");
        }

        var normalizedItems = NormalizeMdrCardItems(request.Items);
        var existingCards = await _dbContext.Set<ContractMdrCard>()
            .Include(x => x.Rows)
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);
        if (existingCards.Count > 0)
        {
            _dbContext.Set<ContractMdrRow>().RemoveRange(existingCards.SelectMany(x => x.Rows));
            _dbContext.Set<ContractMdrCard>().RemoveRange(existingCards);
        }

        foreach (var item in normalizedItems)
        {
            var card = new ContractMdrCard
            {
                ContractId = contractId,
                Title = item.Title,
                ReportingDate = item.ReportingDate,
                SortOrder = item.SortOrder,
                Notes = item.Notes
            };

            foreach (var row in item.Rows)
            {
                card.Rows.Add(new ContractMdrRow
                {
                    RowCode = row.RowCode,
                    Description = row.Description,
                    UnitCode = row.UnitCode,
                    PlanValue = row.PlanValue,
                    ForecastValue = row.ForecastValue,
                    FactValue = row.FactValue,
                    SortOrder = row.SortOrder,
                    Notes = row.Notes
                });
            }

            await _dbContext.Set<ContractMdrCard>().AddAsync(card, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetMdrCardsAsync(contractId, cancellationToken);
    }

    public async Task<ImportContractMdrForecastFactResultDto> ImportMdrForecastFactAsync(
        Guid contractId,
        ImportContractMdrForecastFactRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == contractId, cancellationToken);
        if (contract is null)
        {
            throw new KeyNotFoundException($"Contract '{contractId}' was not found.");
        }

        if (contract.Status is not (ContractStatus.Signed or ContractStatus.Active))
        {
            throw new InvalidOperationException("MDR cards can be edited only for Signed or Active contracts.");
        }

        var normalizedItems = NormalizeMdrForecastFactImportItems(request.Items);
        var cards = await _dbContext.Set<ContractMdrCard>()
            .Include(x => x.Rows)
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);

        var rowIndex = BuildMdrImportRowIndex(cards, out var ambiguousKeys);
        var conflicts = new List<ImportContractMdrForecastFactConflictDto>();
        var uniqueImportKeys = new HashSet<string>(StringComparer.Ordinal);
        var updates = new List<(ContractMdrRow Row, NormalizedMdrForecastFactImportItem Item)>();

        foreach (var item in normalizedItems)
        {
            var key = BuildMdrImportKey(item.CardTitle, item.ReportingDate, item.RowCode);
            if (!uniqueImportKeys.Add(key))
            {
                conflicts.Add(new ImportContractMdrForecastFactConflictDto(
                    item.SourceRowNumber,
                    "DUPLICATE_IMPORT_KEY",
                    "Duplicate key in import payload.",
                    item.CardTitle,
                    item.ReportingDate,
                    item.RowCode));
                continue;
            }

            if (ambiguousKeys.Contains(key))
            {
                conflicts.Add(new ImportContractMdrForecastFactConflictDto(
                    item.SourceRowNumber,
                    "AMBIGUOUS_TARGET",
                    "Multiple MDR rows match the same key in the current contract data.",
                    item.CardTitle,
                    item.ReportingDate,
                    item.RowCode));
                continue;
            }

            if (!rowIndex.TryGetValue(key, out var row))
            {
                conflicts.Add(new ImportContractMdrForecastFactConflictDto(
                    item.SourceRowNumber,
                    "TARGET_NOT_FOUND",
                    "Matching MDR row was not found for key CardTitle + ReportingDate + RowCode.",
                    item.CardTitle,
                    item.ReportingDate,
                    item.RowCode));
                continue;
            }

            updates.Add((row, item));
        }

        var applyChanges = conflicts.Count == 0 || request.SkipConflicts;
        var updatedRows = 0;
        if (applyChanges)
        {
            foreach (var update in updates)
            {
                var nextForecast = update.Item.ForecastValue;
                var nextFact = update.Item.FactValue;
                if (update.Row.ForecastValue != nextForecast || update.Row.FactValue != nextFact)
                {
                    update.Row.ForecastValue = nextForecast;
                    update.Row.FactValue = nextFact;
                    updatedRows++;
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var resultCards = await GetMdrCardsAsync(contractId, cancellationToken);
        return new ImportContractMdrForecastFactResultDto(
            applyChanges,
            normalizedItems.Length,
            updatedRows,
            conflicts.Count,
            conflicts,
            resultCards);
    }

    public async Task<ContractDetailsDto> CreateDraftFromProcedureAsync(
        Guid procedureId,
        CreateContractDraftFromProcedureRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateDraftRequest(request);
        await EnsureProcedureContractAvailableAsync(procedureId, null, cancellationToken);

        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == procedureId, cancellationToken);
        if (procedure is null)
        {
            throw new ArgumentException($"Procedure '{procedureId}' does not exist.", nameof(procedureId));
        }

        if (procedure.Status is not (ProcurementProcedureStatus.DecisionMade or ProcurementProcedureStatus.Completed))
        {
            throw new InvalidOperationException("Draft contract can be generated only for procedures in DecisionMade/Completed statuses.");
        }

        var outcome = await _dbContext.Set<ProcedureOutcome>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ProcedureId == procedureId, cancellationToken);
        if (outcome is null || outcome.IsCanceled || !outcome.WinnerContractorId.HasValue)
        {
            throw new InvalidOperationException("Procedure must have a non-canceled outcome with selected winner.");
        }

        var winnerContractorId = outcome.WinnerContractorId.Value;
        var contractor = await _dbContext.Set<Contractor>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == winnerContractorId, cancellationToken);
        if (contractor is null || contractor.Status != ContractorStatus.Active)
        {
            throw new InvalidOperationException("Winner contractor does not exist or is inactive.");
        }

        var winnerOffer = await _dbContext.Set<ProcedureOffer>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == procedureId && x.ContractorId == winnerContractorId)
            .OrderByDescending(x => x.ReceivedDate ?? DateTime.MinValue)
            .FirstOrDefaultAsync(cancellationToken);
        if (winnerOffer is null)
        {
            throw new InvalidOperationException("Winner contractor offer was not found.");
        }

        var contractNumber = string.IsNullOrWhiteSpace(request.ContractNumber)
            ? await GenerateDraftContractNumberAsync(procedureId, cancellationToken)
            : request.ContractNumber.Trim();

        await EnsureContractNumberAvailableAsync(contractNumber, null, cancellationToken);

        var contract = new Contract
        {
            LotId = procedure.LotId,
            ProcedureId = procedure.Id,
            ContractorId = winnerContractorId,
            ContractNumber = contractNumber,
            SigningDate = request.SigningDate,
            AmountWithoutVat = winnerOffer.AmountWithoutVat,
            VatAmount = winnerOffer.VatAmount,
            TotalAmount = winnerOffer.TotalAmount,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = ContractStatus.Draft
        };

        await _dbContext.Set<Contract>().AddAsync(contract, cancellationToken);
        await _dbContext.Set<ContractStatusHistory>().AddAsync(new ContractStatusHistory
        {
            Contract = contract,
            FromStatus = null,
            ToStatus = ContractStatus.Draft,
            Reason = "Draft generated from procedure outcome"
        }, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDetailsDto(contract, contractor.Name);
    }

    private async Task EnsureProcedureContractAvailableAsync(
        Guid procedureId,
        Guid? excludedContractId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Contracts.Where(x => x.ProcedureId == procedureId);
        if (excludedContractId.HasValue)
        {
            query = query.Where(x => x.Id != excludedContractId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new InvalidOperationException("Contract for this procedure already exists.");
        }
    }

    private async Task EnsureContractNumberAvailableAsync(
        string contractNumber,
        Guid? excludedContractId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Contracts.Where(x => x.ContractNumber == contractNumber);
        if (excludedContractId.HasValue)
        {
            query = query.Where(x => x.Id != excludedContractId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new InvalidOperationException($"Contract number '{contractNumber}' is already used.");
        }
    }

    private async Task EnsureContractExistsAsync(Guid contractId, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Contracts
            .AsNoTracking()
            .AnyAsync(x => x.Id == contractId, cancellationToken);

        if (!exists)
        {
            throw new KeyNotFoundException($"Contract '{contractId}' was not found.");
        }
    }

    private async Task EnsureNoOverdueMilestonesBeforeCloseAsync(Guid contractId, CancellationToken cancellationToken)
    {
        var utcToday = DateTime.UtcNow.Date;
        var hasOverdue = await _dbContext.ContractMilestones
            .AsNoTracking()
            .AnyAsync(
                x => x.ContractId == contractId &&
                     x.ProgressPercent < 100m &&
                     x.PlannedDate < utcToday,
                cancellationToken);

        if (hasOverdue)
        {
            throw new InvalidOperationException("Contract has overdue milestones. Resolve overdue items before closing.");
        }
    }

    private async Task<ContractExecutionSummaryDto> BuildExecutionSummaryAsync(Guid contractId, CancellationToken cancellationToken)
    {
        var utcToday = DateTime.UtcNow.Date;
        var milestones = await _dbContext.ContractMilestones
            .AsNoTracking()
            .Where(x => x.ContractId == contractId)
            .ToListAsync(cancellationToken);

        var total = milestones.Count;
        var completed = milestones.Count(x => x.ProgressPercent >= 100m);
        var overdue = milestones.Count(x => x.ProgressPercent < 100m && x.PlannedDate.Date < utcToday);
        var progress = total == 0
            ? 0m
            : Math.Round(milestones.Average(x => x.ProgressPercent), 2, MidpointRounding.AwayFromZero);
        var nextPlannedDate = milestones
            .Where(x => x.ProgressPercent < 100m)
            .OrderBy(x => x.PlannedDate)
            .Select(x => (DateTime?)x.PlannedDate)
            .FirstOrDefault();

        return new ContractExecutionSummaryDto(
            contractId,
            total,
            completed,
            progress,
            overdue,
            nextPlannedDate);
    }

    private async Task<string> GenerateDraftContractNumberAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        var baseNumber = $"DRAFT-{DateTime.UtcNow:yyyyMMdd}-{procedureId.ToString()[..8].ToUpperInvariant()}";
        var candidate = baseNumber;
        var counter = 1;

        while (await _dbContext.Contracts.AnyAsync(x => x.ContractNumber == candidate, cancellationToken))
        {
            candidate = $"{baseNumber}-{counter}";
            counter++;
        }

        return candidate;
    }

    private async Task<Dictionary<Guid, string>> ResolveContractorNamesAsync(
        IReadOnlyCollection<Guid> contractorIds,
        CancellationToken cancellationToken)
    {
        if (contractorIds.Count == 0)
        {
            return [];
        }

        return await _dbContext.Contractors
            .AsNoTracking()
            .Where(x => contractorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
    }

    private async Task<string?> ResolveContractorNameAsync(Guid contractorId, CancellationToken cancellationToken)
    {
        return await _dbContext.Contractors
            .AsNoTracking()
            .Where(x => x.Id == contractorId)
            .Select(x => x.Name)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static ContractListItemDto ToListItemDto(Contract entity, string? contractorName)
    {
        return new ContractListItemDto(
            entity.Id,
            entity.ContractNumber,
            entity.LotId,
            entity.ProcedureId,
            entity.ContractorId,
            contractorName,
            entity.Status,
            entity.SigningDate,
            entity.AmountWithoutVat,
            entity.VatAmount,
            entity.TotalAmount,
            entity.StartDate,
            entity.EndDate);
    }

    private static ContractDetailsDto ToDetailsDto(Contract entity, string? contractorName)
    {
        return new ContractDetailsDto(
            entity.Id,
            entity.LotId,
            entity.ProcedureId,
            entity.ContractorId,
            contractorName,
            entity.ContractNumber,
            entity.SigningDate,
            entity.AmountWithoutVat,
            entity.VatAmount,
            entity.TotalAmount,
            entity.StartDate,
            entity.EndDate,
            entity.Status);
    }

    private static ContractStatusHistoryItemDto ToHistoryDto(ContractStatusHistory history)
    {
        return new ContractStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
    }

    private static ContractMilestoneDto ToMilestoneDto(ContractMilestone milestone, DateTime utcToday)
    {
        var isOverdue = milestone.ProgressPercent < 100m && milestone.PlannedDate.Date < utcToday;
        return new ContractMilestoneDto(
            milestone.Id,
            milestone.Title,
            milestone.PlannedDate,
            milestone.ActualDate,
            milestone.ProgressPercent,
            milestone.SortOrder,
            milestone.Notes,
            isOverdue);
    }

    private static ContractMonitoringControlPointDto ToControlPointDto(ContractMonitoringControlPoint point, DateTime utcToday)
    {
        var stages = point.Stages
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.PlannedDate)
            .ThenBy(x => x.Name)
            .Select(x => ToControlPointStageDto(x, utcToday))
            .ToArray();

        var pointDelayed = ResolveDelayFlag(
            point.ProgressPercent,
            point.ForecastDate?.Date ?? point.PlannedDate.Date,
            utcToday);
        var stageDelayed = stages.Any(x => x.IsDelayed);

        return new ContractMonitoringControlPointDto(
            point.Id,
            point.Name,
            point.ResponsibleRole,
            point.PlannedDate.Date,
            point.ForecastDate?.Date,
            point.ActualDate?.Date,
            point.ProgressPercent,
            point.SortOrder,
            point.Notes,
            pointDelayed || stageDelayed,
            stages);
    }

    private static ContractMonitoringControlPointStageDto ToControlPointStageDto(
        ContractMonitoringControlPointStage stage,
        DateTime utcToday)
    {
        var delayed = ResolveDelayFlag(
            stage.ProgressPercent,
            stage.ForecastDate?.Date ?? stage.PlannedDate.Date,
            utcToday);

        return new ContractMonitoringControlPointStageDto(
            stage.Id,
            stage.Name,
            stage.PlannedDate.Date,
            stage.ForecastDate?.Date,
            stage.ActualDate?.Date,
            stage.ProgressPercent,
            stage.SortOrder,
            stage.Notes,
            delayed);
    }

    private static ContractMdrCardDto ToMdrCardDto(ContractMdrCard card)
    {
        var rows = card.Rows
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.RowCode)
            .ThenBy(x => x.Description)
            .Select(ToMdrRowDto)
            .ToArray();

        var totalPlan = rows.Sum(x => x.PlanValue);
        var totalForecast = rows.Sum(x => x.ForecastValue);
        var totalFact = rows.Sum(x => x.FactValue);

        return new ContractMdrCardDto(
            card.Id,
            card.Title,
            card.ReportingDate.Date,
            card.SortOrder,
            card.Notes,
            totalPlan,
            totalForecast,
            totalFact,
            CalculateDeviationPercent(totalPlan, totalForecast),
            CalculateDeviationPercent(totalPlan, totalFact),
            rows);
    }

    private static ContractMdrRowDto ToMdrRowDto(ContractMdrRow row)
    {
        return new ContractMdrRowDto(
            row.Id,
            row.RowCode,
            row.Description,
            row.UnitCode,
            row.PlanValue,
            row.ForecastValue,
            row.FactValue,
            CalculateDeviationPercent(row.PlanValue, row.ForecastValue),
            CalculateDeviationPercent(row.PlanValue, row.FactValue),
            row.SortOrder,
            row.Notes);
    }

    private static bool ResolveDelayFlag(decimal progressPercent, DateTime targetDate, DateTime utcToday)
    {
        return progressPercent < 100m && targetDate < utcToday;
    }

    private static decimal? CalculateDeviationPercent(decimal plan, decimal value)
    {
        if (plan <= 0m)
        {
            return null;
        }

        var delta = (value - plan) / plan * 100m;
        return decimal.Round(delta, 2, MidpointRounding.AwayFromZero);
    }

    private static NormalizedControlPointItem[] NormalizeControlPointItems(
        IReadOnlyCollection<UpsertContractMonitoringControlPointItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedControlPointItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var name = item.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException($"Control point #{index}: name is required.");
            }

            if (item.PlannedDate == default)
            {
                throw new ArgumentException($"Control point #{index}: planned date is required.");
            }

            if (item.ProgressPercent < 0m || item.ProgressPercent > 100m)
            {
                throw new ArgumentException($"Control point #{index}: progress must be in range 0..100.");
            }

            var stages = NormalizeControlPointStageItems(item.Stages, index);
            result.Add(new NormalizedControlPointItem(
                name,
                NormalizeOptionalText(item.ResponsibleRole),
                item.PlannedDate.Date,
                item.ForecastDate?.Date,
                item.ActualDate?.Date,
                decimal.Round(item.ProgressPercent, 2, MidpointRounding.AwayFromZero),
                Math.Max(0, item.SortOrder),
                NormalizeOptionalText(item.Notes),
                stages));
        }

        return result.ToArray();
    }

    private static IReadOnlyList<NormalizedControlPointStageItem> NormalizeControlPointStageItems(
        IReadOnlyCollection<UpsertContractMonitoringControlPointStageItemRequest>? items,
        int parentIndex)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedControlPointStageItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var name = item.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException($"Control point #{parentIndex} stage #{index}: name is required.");
            }

            if (item.PlannedDate == default)
            {
                throw new ArgumentException($"Control point #{parentIndex} stage #{index}: planned date is required.");
            }

            if (item.ProgressPercent < 0m || item.ProgressPercent > 100m)
            {
                throw new ArgumentException($"Control point #{parentIndex} stage #{index}: progress must be in range 0..100.");
            }

            result.Add(new NormalizedControlPointStageItem(
                name,
                item.PlannedDate.Date,
                item.ForecastDate?.Date,
                item.ActualDate?.Date,
                decimal.Round(item.ProgressPercent, 2, MidpointRounding.AwayFromZero),
                Math.Max(0, item.SortOrder),
                NormalizeOptionalText(item.Notes)));
        }

        return result.ToArray();
    }

    private static NormalizedMdrCardItem[] NormalizeMdrCardItems(
        IReadOnlyCollection<UpsertContractMdrCardItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMdrCardItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var title = item.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new ArgumentException($"MDR card #{index}: title is required.");
            }

            if (item.ReportingDate == default)
            {
                throw new ArgumentException($"MDR card #{index}: reporting date is required.");
            }

            var rows = NormalizeMdrRowItems(item.Rows, index);
            result.Add(new NormalizedMdrCardItem(
                title,
                item.ReportingDate.Date,
                Math.Max(0, item.SortOrder),
                NormalizeOptionalText(item.Notes),
                rows));
        }

        return result.ToArray();
    }

    private static IReadOnlyList<NormalizedMdrRowItem> NormalizeMdrRowItems(
        IReadOnlyCollection<UpsertContractMdrRowItemRequest>? items,
        int cardIndex)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMdrRowItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var rowCode = item.RowCode?.Trim();
            var description = item.Description?.Trim();
            var unitCode = item.UnitCode?.Trim();

            if (string.IsNullOrWhiteSpace(rowCode))
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: row code is required.");
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: description is required.");
            }

            if (string.IsNullOrWhiteSpace(unitCode))
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: unit code is required.");
            }

            if (item.PlanValue < 0m || item.ForecastValue < 0m || item.FactValue < 0m)
            {
                throw new ArgumentException($"MDR card #{cardIndex} row #{index}: numeric values must be non-negative.");
            }

            result.Add(new NormalizedMdrRowItem(
                rowCode,
                description,
                unitCode.ToUpperInvariant(),
                decimal.Round(item.PlanValue, 2, MidpointRounding.AwayFromZero),
                decimal.Round(item.ForecastValue, 2, MidpointRounding.AwayFromZero),
                decimal.Round(item.FactValue, 2, MidpointRounding.AwayFromZero),
                Math.Max(0, item.SortOrder),
                NormalizeOptionalText(item.Notes)));
        }

        return result.ToArray();
    }

    private static NormalizedMdrForecastFactImportItem[] NormalizeMdrForecastFactImportItems(
        IReadOnlyCollection<ImportContractMdrForecastFactItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMdrForecastFactImportItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var sourceRowNumber = item.SourceRowNumber > 0 ? item.SourceRowNumber : index;
            var cardTitle = item.CardTitle?.Trim();
            var rowCode = item.RowCode?.Trim();

            if (string.IsNullOrWhiteSpace(cardTitle))
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: card title is required.");
            }

            if (item.ReportingDate == default)
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: reporting date is required.");
            }

            if (string.IsNullOrWhiteSpace(rowCode))
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: row code is required.");
            }

            if (item.ForecastValue < 0m || item.FactValue < 0m)
            {
                throw new ArgumentException($"Import row #{sourceRowNumber}: forecast/fact values must be non-negative.");
            }

            result.Add(new NormalizedMdrForecastFactImportItem(
                sourceRowNumber,
                cardTitle,
                item.ReportingDate.Date,
                rowCode.ToUpperInvariant(),
                decimal.Round(item.ForecastValue, 2, MidpointRounding.AwayFromZero),
                decimal.Round(item.FactValue, 2, MidpointRounding.AwayFromZero)));
        }

        return result.ToArray();
    }

    private static Dictionary<string, ContractMdrRow> BuildMdrImportRowIndex(
        IReadOnlyCollection<ContractMdrCard> cards,
        out HashSet<string> ambiguousKeys)
    {
        var index = new Dictionary<string, ContractMdrRow>(StringComparer.Ordinal);
        ambiguousKeys = new HashSet<string>(StringComparer.Ordinal);

        foreach (var card in cards)
        {
            foreach (var row in card.Rows)
            {
                var key = BuildMdrImportKey(card.Title, card.ReportingDate, row.RowCode);
                if (index.TryAdd(key, row))
                {
                    continue;
                }

                ambiguousKeys.Add(key);
                index.Remove(key);
            }
        }

        return index;
    }

    private static string BuildMdrImportKey(string cardTitle, DateTime reportingDate, string rowCode)
    {
        var titleToken = cardTitle.Trim().ToUpperInvariant();
        var rowToken = rowCode.Trim().ToUpperInvariant();
        return $"{titleToken}|{reportingDate.Date:yyyy-MM-dd}|{rowToken}";
    }

    private static void ValidateCreateRequest(CreateContractRequest request)
    {
        if (request.LotId == Guid.Empty)
        {
            throw new ArgumentException("LotId is required.", nameof(request.LotId));
        }

        if (request.ProcedureId == Guid.Empty)
        {
            throw new ArgumentException("ProcedureId is required.", nameof(request.ProcedureId));
        }

        if (request.ContractorId == Guid.Empty)
        {
            throw new ArgumentException("ContractorId is required.", nameof(request.ContractorId));
        }

        ValidateMutableFields(
            request.ContractNumber,
            request.AmountWithoutVat,
            request.VatAmount,
            request.TotalAmount,
            request.StartDate,
            request.EndDate);
    }

    private static void ValidateUpdateRequest(UpdateContractRequest request)
    {
        ValidateMutableFields(
            request.ContractNumber,
            request.AmountWithoutVat,
            request.VatAmount,
            request.TotalAmount,
            request.StartDate,
            request.EndDate);
    }

    private static void ValidateDraftRequest(CreateContractDraftFromProcedureRequest request)
    {
        if (request.StartDate.HasValue &&
            request.EndDate.HasValue &&
            request.StartDate.Value.Date > request.EndDate.Value.Date)
        {
            throw new ArgumentException("StartDate must be less or equal than EndDate.", nameof(request.StartDate));
        }
    }

    private static NormalizedMilestoneItem[] NormalizeMilestoneItems(IReadOnlyCollection<UpsertContractMilestoneItemRequest>? items)
    {
        if (items is null || items.Count == 0)
        {
            return [];
        }

        var result = new List<NormalizedMilestoneItem>(items.Count);
        var index = 0;
        foreach (var item in items)
        {
            index++;
            var title = item.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new ArgumentException($"Milestone #{index}: title is required.");
            }

            if (item.PlannedDate == default)
            {
                throw new ArgumentException($"Milestone #{index}: planned date is required.");
            }

            if (item.ProgressPercent < 0m || item.ProgressPercent > 100m)
            {
                throw new ArgumentException($"Milestone #{index}: progress must be in range 0..100.");
            }

            if (item.SortOrder < 0)
            {
                throw new ArgumentException($"Milestone #{index}: sort order must be non-negative.");
            }

            result.Add(new NormalizedMilestoneItem(
                title,
                item.PlannedDate.Date,
                item.ActualDate?.Date,
                decimal.Round(item.ProgressPercent, 2, MidpointRounding.AwayFromZero),
                item.SortOrder,
                NormalizeOptionalText(item.Notes)));
        }

        return result.ToArray();
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return normalized.Length == 0 ? null : normalized;
    }

    private static void ValidateMutableFields(
        string contractNumber,
        decimal amountWithoutVat,
        decimal vatAmount,
        decimal totalAmount,
        DateTime? startDate,
        DateTime? endDate)
    {
        if (string.IsNullOrWhiteSpace(contractNumber))
        {
            throw new ArgumentException("ContractNumber is required.", nameof(contractNumber));
        }

        if (amountWithoutVat < 0 || vatAmount < 0 || totalAmount < 0)
        {
            throw new ArgumentException("Amount fields must be non-negative.");
        }

        var expectedTotal = amountWithoutVat + vatAmount;
        if (Math.Abs(expectedTotal - totalAmount) > 0.01m)
        {
            throw new ArgumentException("TotalAmount must be equal to AmountWithoutVat + VatAmount.");
        }

        if (startDate.HasValue &&
            endDate.HasValue &&
            startDate.Value.Date > endDate.Value.Date)
        {
            throw new ArgumentException("StartDate must be less or equal than EndDate.", nameof(startDate));
        }
    }

    private static void EnsureTransitionAllowed(
        ContractStatus current,
        ContractStatus target,
        string? reason)
    {
        var delta = (int)target - (int)current;
        if (delta == 1)
        {
            return;
        }

        if (delta == -1)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Rollback reason is required.", nameof(reason));
            }

            return;
        }

        throw new InvalidOperationException($"Transition {current} -> {target} is not allowed.");
    }

    private static void EnsureTransitionStateData(Contract contract, ContractStatus targetStatus)
    {
        if (targetStatus >= ContractStatus.Signed && !contract.SigningDate.HasValue)
        {
            throw new InvalidOperationException("SigningDate is required before transition to Signed.");
        }

        if (targetStatus >= ContractStatus.Active && !contract.StartDate.HasValue)
        {
            throw new InvalidOperationException("StartDate is required before transition to Active.");
        }

        if (targetStatus == ContractStatus.Closed)
        {
            if (!contract.EndDate.HasValue)
            {
                throw new InvalidOperationException("EndDate is required before transition to Closed.");
            }

            if (contract.StartDate.HasValue && contract.EndDate.Value.Date < contract.StartDate.Value.Date)
            {
                throw new InvalidOperationException("EndDate must be greater or equal than StartDate.");
            }
        }
    }

    private sealed record NormalizedMilestoneItem(
        string Title,
        DateTime PlannedDate,
        DateTime? ActualDate,
        decimal ProgressPercent,
        int SortOrder,
        string? Notes);

    private sealed record NormalizedControlPointItem(
        string Name,
        string? ResponsibleRole,
        DateTime PlannedDate,
        DateTime? ForecastDate,
        DateTime? ActualDate,
        decimal ProgressPercent,
        int SortOrder,
        string? Notes,
        IReadOnlyList<NormalizedControlPointStageItem> Stages);

    private sealed record NormalizedControlPointStageItem(
        string Name,
        DateTime PlannedDate,
        DateTime? ForecastDate,
        DateTime? ActualDate,
        decimal ProgressPercent,
        int SortOrder,
        string? Notes);

    private sealed record NormalizedMdrCardItem(
        string Title,
        DateTime ReportingDate,
        int SortOrder,
        string? Notes,
        IReadOnlyList<NormalizedMdrRowItem> Rows);

    private sealed record NormalizedMdrRowItem(
        string RowCode,
        string Description,
        string UnitCode,
        decimal PlanValue,
        decimal ForecastValue,
        decimal FactValue,
        int SortOrder,
        string? Notes);

    private sealed record NormalizedMdrForecastFactImportItem(
        int SourceRowNumber,
        string CardTitle,
        DateTime ReportingDate,
        string RowCode,
        decimal ForecastValue,
        decimal FactValue);
}
