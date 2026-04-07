using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Files;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

public sealed class ProcurementProceduresService : IProcurementProceduresService
{
    private const string RequestFileOwnerEntityType = "PROC_REQUEST";
    private const string ExternalApprovalProtocolFileOwnerEntityType = "PROC_EXTERNAL_APPROVAL";
    private const string OfferFileOwnerEntityType = "PROC_OFFER";
    private const string OutcomeProtocolFileOwnerEntityType = "PROC_OUTCOME_PROTOCOL";
    private const string UnassignedFileOwnerEntityType = "UNASSIGNED";

    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IContractorsService? _contractorsService;

    public ProcurementProceduresService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IContractorsService? contractorsService = null)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _contractorsService = contractorsService;
    }

    public async Task<IReadOnlyList<ProcedureListItemDto>> ListAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        CancellationToken cancellationToken = default)
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

        return await query
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
                x.ApprovalMode))
            .ToListAsync(cancellationToken);
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

        var attachments = await LoadAttachmentsAsync(procedure.Id, cancellationToken);
        return ToDetailsDto(procedure, attachments);
    }

    public async Task<ProcedureDetailsDto> CreateAsync(CreateProcedureRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRequest(request);

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

        ApplyValues(procedure, request);

        await _dbContext.Set<ProcurementProcedure>().AddAsync(procedure, cancellationToken);
        await _dbContext.Set<ProcurementProcedureStatusHistory>().AddAsync(new ProcurementProcedureStatusHistory
        {
            Procedure = procedure,
            FromStatus = null,
            ToStatus = ProcurementProcedureStatus.Created,
            Reason = "Procedure created"
        }, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        await RebindRequestAttachmentsAsync(procedure.Id, request.AttachmentFileIds, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var attachments = await LoadAttachmentsAsync(procedure.Id, cancellationToken);
        return ToDetailsDto(procedure, attachments);
    }

    public async Task<ProcedureDetailsDto?> UpdateAsync(Guid id, UpdateProcedureRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRequest(request);

        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (procedure is null)
        {
            return null;
        }

        ApplyValues(procedure, request);
        await RebindRequestAttachmentsAsync(procedure.Id, request.AttachmentFileIds, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var attachments = await LoadAttachmentsAsync(procedure.Id, cancellationToken);
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

    public async Task<ProcedureStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        ProcedureStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (procedure is null)
        {
            return null;
        }

        if (procedure.Status == request.TargetStatus)
        {
            throw new ArgumentException("Target status must differ from current status.", nameof(request.TargetStatus));
        }

        EnsureTransitionAllowed(procedure.Status, request.TargetStatus, request.Reason);
        if (request.TargetStatus == ProcurementProcedureStatus.OnApproval)
        {
            await PrepareForApprovalAsync(procedure, cancellationToken);
        }

        if (request.TargetStatus == ProcurementProcedureStatus.Completed)
        {
            await EnsureCompletionRequirementsAsync(procedure, cancellationToken);
        }

        var reason = request.Reason?.Trim() ?? string.Empty;
        var history = await UpdateProcedureStatusAsync(procedure, request.TargetStatus, reason, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToHistoryDto(history);
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

    public async Task<IReadOnlyList<ProcedureApprovalStepDto>> GetApprovalStepsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        return await _dbContext.ProcedureApprovalSteps
            .AsNoTracking()
            .Where(x => x.ProcedureId == procedureId)
            .OrderBy(x => x.StepOrder)
            .Select(x => new ProcedureApprovalStepDto(
                x.Id,
                x.StepOrder,
                x.StepTitle,
                x.ApproverUserId,
                x.ApproverRoleName,
                x.IsRequired,
                x.Status,
                x.DecisionByUserId,
                x.DecisionAtUtc,
                x.DecisionComment))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureApprovalStepDto>> ConfigureApprovalStepsAsync(
        Guid procedureId,
        ConfigureProcedureApprovalRequest request,
        CancellationToken cancellationToken = default)
    {
        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.ApprovalMode != ProcedureApprovalMode.InSystem)
        {
            throw new InvalidOperationException("Approval steps are available only for in-system approval mode.");
        }

        if (procedure.Status is not (ProcurementProcedureStatus.Created or ProcurementProcedureStatus.DocumentsPreparation or ProcurementProcedureStatus.OnApproval))
        {
            throw new InvalidOperationException("Approval route can be configured only for draft/on-approval procedures.");
        }

        var normalizedSteps = NormalizeApprovalSteps(request.Steps);

        var existingSteps = await _dbContext.Set<ProcedureApprovalStep>()
            .Where(x => x.ProcedureId == procedureId)
            .ToListAsync(cancellationToken);

        if (existingSteps.Count > 0)
        {
            _dbContext.Set<ProcedureApprovalStep>().RemoveRange(existingSteps);
        }

        foreach (var step in normalizedSteps)
        {
            await _dbContext.Set<ProcedureApprovalStep>().AddAsync(new ProcedureApprovalStep
            {
                ProcedureId = procedureId,
                StepOrder = step.StepOrder,
                StepTitle = step.StepTitle,
                ApproverUserId = step.ApproverUserId,
                ApproverRoleName = step.ApproverRoleName,
                IsRequired = step.IsRequired,
                Status = ProcedureApprovalStepStatus.Pending
            }, cancellationToken);
        }

        if (normalizedSteps.Length > 0 && procedure.Status == ProcurementProcedureStatus.Created)
        {
            await UpdateProcedureStatusAsync(procedure, ProcurementProcedureStatus.DocumentsPreparation, "Approval route configured", cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetApprovalStepsAsync(procedureId, cancellationToken);
    }

    public async Task<ProcedureApprovalStepDto?> DecideApprovalStepAsync(
        Guid procedureId,
        Guid stepId,
        DecideProcedureApprovalStepRequest request,
        CancellationToken cancellationToken = default)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == procedureId, cancellationToken);
        if (procedure is null)
        {
            return null;
        }

        if (procedure.ApprovalMode != ProcedureApprovalMode.InSystem)
        {
            throw new InvalidOperationException("Approval step decisions are available only for in-system approval mode.");
        }

        if (procedure.Status != ProcurementProcedureStatus.OnApproval)
        {
            throw new InvalidOperationException("Approval decisions can be recorded only in 'OnApproval' status.");
        }

        if (request.DecisionStatus == ProcedureApprovalStepStatus.Pending)
        {
            throw new ArgumentException("Decision status cannot be Pending.", nameof(request.DecisionStatus));
        }

        var steps = await _dbContext.Set<ProcedureApprovalStep>()
            .Where(x => x.ProcedureId == procedureId)
            .OrderBy(x => x.StepOrder)
            .ToListAsync(cancellationToken);

        var step = steps.FirstOrDefault(x => x.Id == stepId);
        if (step is null)
        {
            return null;
        }

        if (step.Status != ProcedureApprovalStepStatus.Pending)
        {
            throw new InvalidOperationException("Only pending steps can be decided.");
        }

        var hasRequiredPrerequisites = steps
            .Where(x => x.StepOrder < step.StepOrder && x.IsRequired)
            .All(x => x.Status == ProcedureApprovalStepStatus.Approved);

        if (!hasRequiredPrerequisites)
        {
            throw new InvalidOperationException("Previous required approval steps must be approved first.");
        }

        step.Status = request.DecisionStatus;
        step.DecisionComment = NormalizeOptionalText(request.Comment);
        step.DecisionAtUtc = DateTimeOffset.UtcNow;
        step.DecisionByUserId = await ResolveCurrentUserIdAsync(cancellationToken);

        if (request.DecisionStatus == ProcedureApprovalStepStatus.Approved)
        {
            var allRequiredApproved = steps
                .Where(x => x.IsRequired)
                .All(x => x.Id == step.Id
                    ? request.DecisionStatus == ProcedureApprovalStepStatus.Approved
                    : x.Status == ProcedureApprovalStepStatus.Approved);

            if (allRequiredApproved)
            {
                await UpdateProcedureStatusAsync(
                    procedure,
                    ProcurementProcedureStatus.Sent,
                    "In-system approval route completed",
                    cancellationToken);
            }
        }
        else
        {
            var decisionReason = string.IsNullOrWhiteSpace(step.DecisionComment)
                ? $"Approval step #{step.StepOrder} has status '{request.DecisionStatus}'."
                : step.DecisionComment!;

            await UpdateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.DocumentsPreparation,
                decisionReason,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ProcedureApprovalStepDto(
            step.Id,
            step.StepOrder,
            step.StepTitle,
            step.ApproverUserId,
            step.ApproverRoleName,
            step.IsRequired,
            step.Status,
            step.DecisionByUserId,
            step.DecisionAtUtc,
            step.DecisionComment);
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
        CancellationToken cancellationToken = default)
    {
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
        await RebindExternalApprovalProtocolAsync(
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
            await UpdateProcedureStatusAsync(
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

            await UpdateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.DocumentsPreparation,
                entity.Comment,
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToExternalApprovalDto(entity);
    }

    public async Task<IReadOnlyList<ProcedureShortlistItemDto>> GetShortlistAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        return await _dbContext.ProcedureShortlistItems
            .AsNoTracking()
            .Include(x => x.Contractor)
            .Where(x => x.ProcedureId == procedureId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Contractor.Name)
            .Select(x => new ProcedureShortlistItemDto(
                x.Id,
                x.ContractorId,
                x.Contractor.Name,
                x.IsIncluded,
                x.SortOrder,
                x.ExclusionReason,
                x.Notes))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureShortlistItemDto>> UpsertShortlistAsync(
        Guid procedureId,
        UpdateProcedureShortlistRequest request,
        CancellationToken cancellationToken = default)
    {
        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.Status is ProcurementProcedureStatus.Canceled or ProcurementProcedureStatus.Completed)
        {
            throw new InvalidOperationException("Shortlist cannot be edited for completed or canceled procedures.");
        }

        var normalizedItems = NormalizeShortlistItems(request.Items);
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
                throw new ArgumentException($"Unknown or inactive contractors in shortlist: {string.Join(", ", missing)}");
            }
        }

        var existingItems = await _dbContext.Set<ProcedureShortlistItem>()
            .Where(x => x.ProcedureId == procedureId)
            .ToListAsync(cancellationToken);

        var adjustmentLogs = BuildShortlistAdjustmentLogs(
            procedureId,
            existingItems,
            normalizedItems,
            request.AdjustmentReason);

        if (existingItems.Count > 0)
        {
            _dbContext.Set<ProcedureShortlistItem>().RemoveRange(existingItems);
        }

        if (adjustmentLogs.Count > 0)
        {
            await _dbContext.Set<ProcedureShortlistAdjustmentLog>().AddRangeAsync(adjustmentLogs, cancellationToken);
        }

        foreach (var item in normalizedItems)
        {
            await _dbContext.Set<ProcedureShortlistItem>().AddAsync(new ProcedureShortlistItem
            {
                ProcedureId = procedureId,
                ContractorId = item.ContractorId,
                IsIncluded = item.IsIncluded,
                SortOrder = item.SortOrder,
                ExclusionReason = item.ExclusionReason,
                Notes = item.Notes
            }, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetShortlistAsync(procedureId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureShortlistRecommendationDto>> BuildShortlistRecommendationsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.Status is ProcurementProcedureStatus.Canceled or ProcurementProcedureStatus.Completed)
        {
            throw new InvalidOperationException("Shortlist recommendations are not available for completed or canceled procedures.");
        }

        if (_contractorsService is not null)
        {
            await _contractorsService.RecalculateCurrentLoadsAsync(cancellationToken);
        }
        else
        {
            await RecalculateContractorLoadsFallbackAsync(cancellationToken);
        }

        var requiredDisciplines = await _dbContext.Set<LotItem>()
            .AsNoTracking()
            .Where(x => x.LotId == procedure.LotId)
            .Select(x => x.DisciplineCode)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .Distinct()
            .ToArrayAsync(cancellationToken);

        var contractors = await _dbContext.Set<Contractor>()
            .AsNoTracking()
            .Include(x => x.Qualifications)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var candidates = new List<ShortlistRecommendationCandidate>(contractors.Count);

        foreach (var contractor in contractors)
        {
            var qualificationSet = contractor.Qualifications
                .Select(x => x.DisciplineCode.Trim().ToUpperInvariant())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingDisciplines = requiredDisciplines
                .Where(x => !qualificationSet.Contains(x))
                .ToArray();

            var hasRequiredQualifications = missingDisciplines.Length == 0;
            var hasAnyQualificationMatch = requiredDisciplines.Length == 0 ||
                                           requiredDisciplines.Any(x => qualificationSet.Contains(x));
            var isStatusAllowed = contractor.Status == ContractorStatus.Active;
            var isReliabilityAllowed = contractor.ReliabilityClass != ReliabilityClass.D;
            var isLoadAllowed = contractor.CurrentLoadPercent <= 100m;

            var recommendationScore = CalculateRecommendationScore(
                contractor,
                hasRequiredQualifications,
                hasAnyQualificationMatch);

            var isRecommended = isStatusAllowed && isReliabilityAllowed && isLoadAllowed && hasRequiredQualifications;

            var decisionFactors = BuildDecisionFactors(
                contractor,
                hasRequiredQualifications,
                hasAnyQualificationMatch,
                missingDisciplines,
                isRecommended);

            candidates.Add(new ShortlistRecommendationCandidate(
                contractor.Id,
                contractor.Name,
                isRecommended,
                recommendationScore,
                contractor.Status,
                contractor.ReliabilityClass,
                contractor.CurrentRating,
                contractor.CurrentLoadPercent,
                hasRequiredQualifications,
                missingDisciplines,
                decisionFactors));
        }

        var ordered = candidates
            .OrderByDescending(x => x.IsRecommended)
            .ThenByDescending(x => x.Score)
            .ThenBy(x => x.CurrentLoadPercent)
            .ThenBy(x => x.ContractorName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var recommendedSortOrder = 0;
        return ordered
            .Select(x => new ProcedureShortlistRecommendationDto(
                x.ContractorId,
                x.ContractorName,
                x.IsRecommended,
                x.IsRecommended ? recommendedSortOrder++ : null,
                x.Score,
                x.ContractorStatus,
                x.ReliabilityClass,
                x.CurrentRating,
                x.CurrentLoadPercent,
                x.HasRequiredQualifications,
                x.MissingDisciplineCodes,
                x.DecisionFactors))
            .ToArray();
    }

    public async Task<ApplyProcedureShortlistRecommendationsResultDto> ApplyShortlistRecommendationsAsync(
        Guid procedureId,
        ApplyProcedureShortlistRecommendationsRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var normalizedMaxIncluded = request.MaxIncluded switch
        {
            < 1 => 1,
            > 30 => 30,
            _ => request.MaxIncluded
        };

        var recommendations = await BuildShortlistRecommendationsAsync(procedureId, cancellationToken);
        var selected = recommendations
            .Where(x => x.IsRecommended)
            .Take(normalizedMaxIncluded)
            .ToArray();

        var shortlist = await UpsertShortlistAsync(
            procedureId,
            new UpdateProcedureShortlistRequest
            {
                AdjustmentReason = NormalizeOptionalText(request.AdjustmentReason) ?? "Auto shortlist apply",
                Items = selected
                    .Select((x, index) => new UpsertProcedureShortlistItemRequest
                    {
                        ContractorId = x.ContractorId,
                        IsIncluded = true,
                        SortOrder = index
                    })
                    .ToArray()
            },
            cancellationToken);

        return new ApplyProcedureShortlistRecommendationsResultDto(
            recommendations.Count,
            selected.Length,
            shortlist);
    }

    public async Task<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>> GetShortlistAdjustmentsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        await EnsureProcedureExistsAsync(procedureId, cancellationToken);

        return await _dbContext.ProcedureShortlistAdjustmentLogs
            .AsNoTracking()
            .Include(x => x.Contractor)
            .Where(x => x.ProcedureId == procedureId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.OperationId)
            .Select(x => new ProcedureShortlistAdjustmentLogDto(
                x.Id,
                x.OperationId,
                x.ContractorId,
                x.Contractor.Name,
                x.PreviousIsIncluded,
                x.NewIsIncluded,
                x.PreviousSortOrder,
                x.NewSortOrder,
                x.PreviousExclusionReason,
                x.NewExclusionReason,
                x.Reason,
                x.CreatedBy,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
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
        CancellationToken cancellationToken = default)
    {
        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.Status is ProcurementProcedureStatus.Created
            or ProcurementProcedureStatus.DocumentsPreparation
            or ProcurementProcedureStatus.OnApproval
            or ProcurementProcedureStatus.Canceled
            or ProcurementProcedureStatus.Completed)
        {
            throw new InvalidOperationException("Offers can be updated only after procedure is sent and before completion.");
        }

        var normalizedItems = NormalizeOfferItems(request.Items);
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

        await RebindOfferFilesAsync(procedureId, oldOfferFileIds, newOfferFileIds, cancellationToken);

        if (normalizedItems.Length > 0 &&
            procedure.Status is ProcurementProcedureStatus.Sent or ProcurementProcedureStatus.Retender)
        {
            var reason = procedure.Status == ProcurementProcedureStatus.Retender
                ? "Offers received after retender"
                : "Offers received";

            await UpdateProcedureStatusAsync(
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
        CancellationToken cancellationToken = default)
    {
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

        await RebindOutcomeProtocolAsync(
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
            await UpdateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.Retender,
                cancellationReason!,
                cancellationToken);

            await SyncLotStatusAsync(
                procedure.LotId,
                LotStatus.InProcurement,
                "Procedure returned to retender stage",
                cancellationToken);
        }
        else
        {
            await UpdateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.DecisionMade,
                comment ?? "Winner selected",
                cancellationToken);

            await SyncLotStatusAsync(
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

    private async Task EnsureCompletionRequirementsAsync(ProcurementProcedure procedure, CancellationToken cancellationToken)
    {
        var contracts = await _dbContext.Contracts
            .AsNoTracking()
            .Where(x => x.ProcedureId == procedure.Id)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (contracts.Count == 0)
        {
            throw new InvalidOperationException("Procedure can be completed only after contract draft is created.");
        }

        if (contracts.Count > 1)
        {
            throw new InvalidOperationException("Procedure has multiple contracts. Keep only one contract before completion.");
        }

        var contract = contracts[0];
        if (contract.LotId != procedure.LotId)
        {
            throw new InvalidOperationException("Bound contract lot does not match procedure lot.");
        }

        await SyncLotStatusAsync(
            procedure.LotId,
            LotStatus.Contracted,
            "Procedure completed and contract draft is bound",
            cancellationToken);
    }

    private async Task SyncLotStatusAsync(
        Guid lotId,
        LotStatus targetStatus,
        string reason,
        CancellationToken cancellationToken)
    {
        var lot = await _dbContext.Set<Lot>()
            .FirstOrDefaultAsync(x => x.Id == lotId, cancellationToken);
        if (lot is null || lot.Status == targetStatus)
        {
            return;
        }

        var shouldApply = targetStatus switch
        {
            LotStatus.InProcurement => lot.Status is LotStatus.ContractorSelected or LotStatus.Contracted,
            LotStatus.ContractorSelected => lot.Status == LotStatus.InProcurement,
            LotStatus.Contracted => lot.Status is LotStatus.InProcurement or LotStatus.ContractorSelected,
            _ => false
        };

        if (!shouldApply)
        {
            return;
        }

        await _dbContext.Set<LotStatusHistory>().AddAsync(new LotStatusHistory
        {
            LotId = lot.Id,
            FromStatus = lot.Status,
            ToStatus = targetStatus,
            Reason = reason
        }, cancellationToken);

        lot.Status = targetStatus;
    }

    private async Task PrepareForApprovalAsync(ProcurementProcedure procedure, CancellationToken cancellationToken)
    {
        if (procedure.ApprovalMode != ProcedureApprovalMode.InSystem)
        {
            return;
        }

        var steps = await _dbContext.Set<ProcedureApprovalStep>()
            .Where(x => x.ProcedureId == procedure.Id)
            .OrderBy(x => x.StepOrder)
            .ToListAsync(cancellationToken);

        if (steps.Count == 0)
        {
            throw new InvalidOperationException("Approval steps must be configured before moving to 'OnApproval'.");
        }

        foreach (var step in steps)
        {
            step.Status = ProcedureApprovalStepStatus.Pending;
            step.DecisionAtUtc = null;
            step.DecisionByUserId = null;
            step.DecisionComment = null;
        }
    }

    private async Task<ProcurementProcedureStatusHistory> UpdateProcedureStatusAsync(
        ProcurementProcedure procedure,
        ProcurementProcedureStatus targetStatus,
        string reason,
        CancellationToken cancellationToken)
    {
        if (procedure.Status == targetStatus)
        {
            return new ProcurementProcedureStatusHistory
            {
                ProcedureId = procedure.Id,
                FromStatus = targetStatus,
                ToStatus = targetStatus,
                Reason = reason
            };
        }

        var history = new ProcurementProcedureStatusHistory
        {
            ProcedureId = procedure.Id,
            FromStatus = procedure.Status,
            ToStatus = targetStatus,
            Reason = reason
        };

        procedure.Status = targetStatus;
        await _dbContext.Set<ProcurementProcedureStatusHistory>().AddAsync(history, cancellationToken);
        return history;
    }

    private async Task RebindRequestAttachmentsAsync(Guid procedureId, IReadOnlyCollection<Guid>? attachmentFileIds, CancellationToken cancellationToken)
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

    private async Task RebindExternalApprovalProtocolAsync(
        Guid procedureId,
        Guid? oldProtocolFileId,
        Guid? newProtocolFileId,
        CancellationToken cancellationToken)
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

    private async Task RebindOfferFilesAsync(
        Guid procedureId,
        IReadOnlyCollection<Guid> oldOfferFileIds,
        IReadOnlyCollection<Guid> newOfferFileIds,
        CancellationToken cancellationToken)
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

    private async Task RebindOutcomeProtocolAsync(
        Guid procedureId,
        Guid? oldProtocolFileId,
        Guid? newProtocolFileId,
        CancellationToken cancellationToken)
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

    private async Task<ProcedureAttachmentDto[]> LoadAttachmentsAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        return await _dbContext.Files
            .AsNoTracking()
            .Where(x => x.OwnerEntityType == RequestFileOwnerEntityType && x.OwnerEntityId == procedureId)
            .OrderBy(x => x.FileName)
            .Select(x => new ProcedureAttachmentDto(x.Id, x.FileName, x.ContentType, x.FileSizeBytes))
            .ToArrayAsync(cancellationToken);
    }

    private async Task<Guid?> ResolveCurrentUserIdAsync(CancellationToken cancellationToken)
    {
        var login = _currentUserService.UserLogin;
        if (string.IsNullOrWhiteSpace(login) || login == "system")
        {
            return null;
        }

        return await _dbContext.Users
            .Where(x => x.Login == login && x.IsActive)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static HashSet<Guid> NormalizeAttachmentIds(IReadOnlyCollection<Guid>? ids)
    {
        return (ids ?? Array.Empty<Guid>())
            .Where(x => x != Guid.Empty)
            .ToHashSet();
    }

    private static Guid? NormalizeOptionalGuid(Guid? value)
    {
        return value.HasValue && value.Value != Guid.Empty ? value : null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private async Task RecalculateContractorLoadsFallbackAsync(CancellationToken cancellationToken)
    {
        var activeLoadByContractor = await (
                from contract in _dbContext.Set<Contract>().AsNoTracking()
                join item in _dbContext.Set<LotItem>().AsNoTracking()
                    on contract.LotId equals item.LotId
                where contract.Status == ContractStatus.Signed || contract.Status == ContractStatus.Active
                group item by contract.ContractorId
                into grouped
                select new
                {
                    ContractorId = grouped.Key,
                    TotalManHours = grouped.Sum(x => x.ManHours)
                })
            .ToDictionaryAsync(
                x => x.ContractorId,
                x => x.TotalManHours,
                cancellationToken);

        var contractors = await _dbContext.Set<Contractor>()
            .Where(x => x.Status == ContractorStatus.Active)
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var contractor in contractors)
        {
            var activeLoadHours = activeLoadByContractor.GetValueOrDefault(contractor.Id);
            var calculatedLoadPercent = CalculateLoadPercent(activeLoadHours, contractor.CapacityHours);
            if (contractor.CurrentLoadPercent == calculatedLoadPercent)
            {
                continue;
            }

            contractor.CurrentLoadPercent = calculatedLoadPercent;
            changed = true;
        }

        if (changed)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private static decimal CalculateRecommendationScore(
        Contractor contractor,
        bool hasRequiredQualifications,
        bool hasAnyQualificationMatch)
    {
        var score = contractor.CurrentRating * 20m;
        score += contractor.ReliabilityClass switch
        {
            ReliabilityClass.A => 25m,
            ReliabilityClass.B => 15m,
            ReliabilityClass.New => 8m,
            ReliabilityClass.D => -50m,
            _ => 0m
        };

        score += hasRequiredQualifications
            ? 25m
            : hasAnyQualificationMatch
                ? 8m
                : -20m;

        score -= Math.Min(contractor.CurrentLoadPercent, 200m) * 0.25m;

        if (contractor.Status != ContractorStatus.Active)
        {
            score -= 100m;
        }

        if (contractor.ReliabilityClass == ReliabilityClass.D)
        {
            score -= 80m;
        }

        if (!hasRequiredQualifications)
        {
            score -= 20m;
        }

        score *= contractor.ManualSupportCoefficient ?? 1m;
        return decimal.Round(score, 2, MidpointRounding.AwayFromZero);
    }

    private static IReadOnlyList<string> BuildDecisionFactors(
        Contractor contractor,
        bool hasRequiredQualifications,
        bool hasAnyQualificationMatch,
        IReadOnlyList<string> missingDisciplines,
        bool isRecommended)
    {
        var factors = new List<string>(6)
        {
            $"Рейтинг: {contractor.CurrentRating:0.###}",
            $"Текущая загрузка: {contractor.CurrentLoadPercent:0.##}%"
        };

        if (contractor.Status != ContractorStatus.Active)
        {
            factors.Add("Подрядчик не активен.");
        }

        if (contractor.ReliabilityClass == ReliabilityClass.D)
        {
            factors.Add("Класс надежности D.");
        }

        if (!hasRequiredQualifications)
        {
            factors.Add(missingDisciplines.Count == 0
                ? "Нет требуемых квалификаций."
                : $"Не хватает квалификаций: {string.Join(", ", missingDisciplines)}.");
        }
        else if (hasAnyQualificationMatch)
        {
            factors.Add("Все требуемые квалификации подтверждены.");
        }

        if (contractor.CurrentLoadPercent > 100m)
        {
            factors.Add("Загрузка превышает 100%.");
        }

        if (isRecommended)
        {
            factors.Add("Рекомендован к включению в shortlist.");
        }

        return factors;
    }

    private static decimal CalculateLoadPercent(decimal activeLoadHours, decimal capacityHours)
    {
        if (capacityHours <= 0)
        {
            return activeLoadHours > 0 ? 100m : 0m;
        }

        var value = activeLoadHours * 100m / capacityHours;
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static IReadOnlyList<ProcedureShortlistAdjustmentLog> BuildShortlistAdjustmentLogs(
        Guid procedureId,
        IReadOnlyCollection<ProcedureShortlistItem> existingItems,
        IReadOnlyCollection<NormalizedShortlistItem> updatedItems,
        string? adjustmentReason)
    {
        if (existingItems.Count == 0)
        {
            return Array.Empty<ProcedureShortlistAdjustmentLog>();
        }

        var existingByContractor = existingItems.ToDictionary(x => x.ContractorId);
        var updatedByContractor = updatedItems.ToDictionary(x => x.ContractorId);
        var allContractorIds = existingByContractor.Keys
            .Union(updatedByContractor.Keys)
            .Distinct()
            .ToArray();

        var operationId = Guid.NewGuid();
        var reason = NormalizeOptionalText(adjustmentReason) ?? "Manual shortlist update";
        var logs = new List<ProcedureShortlistAdjustmentLog>(allContractorIds.Length);

        foreach (var contractorId in allContractorIds)
        {
            existingByContractor.TryGetValue(contractorId, out var previous);
            updatedByContractor.TryGetValue(contractorId, out var next);

            var previousExclusionReason = NormalizeOptionalText(previous?.ExclusionReason);
            var nextExclusionReason = NormalizeOptionalText(next?.ExclusionReason);

            var changed = previous is null ||
                          next is null ||
                          previous.IsIncluded != next.IsIncluded ||
                          previous.SortOrder != next.SortOrder ||
                          !string.Equals(previousExclusionReason, nextExclusionReason, StringComparison.Ordinal);

            if (!changed)
            {
                continue;
            }

            logs.Add(new ProcedureShortlistAdjustmentLog
            {
                OperationId = operationId,
                ProcedureId = procedureId,
                ContractorId = contractorId,
                PreviousIsIncluded = previous?.IsIncluded,
                NewIsIncluded = next?.IsIncluded ?? false,
                PreviousSortOrder = previous?.SortOrder,
                NewSortOrder = next?.SortOrder ?? previous?.SortOrder ?? 0,
                PreviousExclusionReason = previousExclusionReason,
                NewExclusionReason = next is null
                    ? "Removed from shortlist"
                    : nextExclusionReason,
                Reason = reason
            });
        }

        return logs;
    }

    private static NormalizedApprovalStep[] NormalizeApprovalSteps(IReadOnlyCollection<ConfigureProcedureApprovalStepRequest>? steps)
    {
        var result = (steps ?? Array.Empty<ConfigureProcedureApprovalStepRequest>())
            .Select((step, index) =>
            {
                if (step.StepOrder <= 0)
                {
                    throw new ArgumentException($"Step #{index + 1}: stepOrder must be greater than 0.", nameof(step.StepOrder));
                }

                if (string.IsNullOrWhiteSpace(step.StepTitle))
                {
                    throw new ArgumentException($"Step #{index + 1}: stepTitle is required.", nameof(step.StepTitle));
                }

                var normalizedRoleName = NormalizeOptionalText(step.ApproverRoleName);
                if (!step.ApproverUserId.HasValue && string.IsNullOrWhiteSpace(normalizedRoleName))
                {
                    throw new ArgumentException(
                        $"Step #{index + 1}: either approverUserId or approverRoleName must be provided.",
                        nameof(step.ApproverUserId));
                }

                return new NormalizedApprovalStep(
                    step.StepOrder,
                    step.StepTitle.Trim(),
                    step.ApproverUserId,
                    normalizedRoleName,
                    step.IsRequired);
            })
            .OrderBy(x => x.StepOrder)
            .ToArray();

        var duplicateOrder = result
            .GroupBy(x => x.StepOrder)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicateOrder is not null)
        {
            throw new ArgumentException($"Duplicate stepOrder '{duplicateOrder.Key}' in approval route.");
        }

        return result;
    }

    private static NormalizedShortlistItem[] NormalizeShortlistItems(IReadOnlyCollection<UpsertProcedureShortlistItemRequest>? items)
    {
        var result = (items ?? Array.Empty<UpsertProcedureShortlistItemRequest>())
            .Select((item, index) =>
            {
                if (item.ContractorId == Guid.Empty)
                {
                    throw new ArgumentException($"Shortlist item #{index + 1}: contractorId is required.", nameof(item.ContractorId));
                }

                if (!item.IsIncluded && string.IsNullOrWhiteSpace(item.ExclusionReason))
                {
                    throw new ArgumentException(
                        $"Shortlist item #{index + 1}: exclusionReason is required when contractor is excluded.",
                        nameof(item.ExclusionReason));
                }

                if (item.SortOrder < 0)
                {
                    throw new ArgumentException($"Shortlist item #{index + 1}: sortOrder must be non-negative.", nameof(item.SortOrder));
                }

                return new NormalizedShortlistItem(
                    item.ContractorId,
                    item.IsIncluded,
                    item.SortOrder,
                    item.IsIncluded ? null : item.ExclusionReason?.Trim(),
                    NormalizeOptionalText(item.Notes));
            })
            .OrderBy(x => x.SortOrder)
            .ToArray();

        var duplicateContractor = result
            .GroupBy(x => x.ContractorId)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicateContractor is not null)
        {
            throw new ArgumentException($"Duplicate contractor '{duplicateContractor.Key}' in shortlist.");
        }

        return result;
    }

    private static NormalizedOfferItem[] NormalizeOfferItems(IReadOnlyCollection<UpsertProcedureOfferItemRequest>? items)
    {
        var result = (items ?? Array.Empty<UpsertProcedureOfferItemRequest>())
            .Select((item, index) =>
            {
                if (item.ContractorId == Guid.Empty)
                {
                    throw new ArgumentException($"Offer item #{index + 1}: contractorId is required.", nameof(item.ContractorId));
                }

                if (string.IsNullOrWhiteSpace(item.OfferNumber))
                {
                    throw new ArgumentException($"Offer item #{index + 1}: offerNumber is required.", nameof(item.OfferNumber));
                }

                if (item.AmountWithoutVat < 0 || item.VatAmount < 0 || item.TotalAmount < 0)
                {
                    throw new ArgumentException(
                        $"Offer item #{index + 1}: amountWithoutVat, vatAmount and totalAmount must be non-negative.");
                }

                var expectedTotal = item.AmountWithoutVat + item.VatAmount;
                if (Math.Abs(expectedTotal - item.TotalAmount) > 0.01m)
                {
                    throw new ArgumentException(
                        $"Offer item #{index + 1}: totalAmount must equal amountWithoutVat + vatAmount.");
                }

                if (item.DurationDays.HasValue && item.DurationDays.Value < 0)
                {
                    throw new ArgumentException($"Offer item #{index + 1}: durationDays must be non-negative.", nameof(item.DurationDays));
                }

                if (string.IsNullOrWhiteSpace(item.CurrencyCode))
                {
                    throw new ArgumentException($"Offer item #{index + 1}: currencyCode is required.", nameof(item.CurrencyCode));
                }

                return new NormalizedOfferItem(
                    item.ContractorId,
                    item.OfferNumber.Trim(),
                    item.ReceivedDate,
                    item.AmountWithoutVat,
                    item.VatAmount,
                    item.TotalAmount,
                    item.DurationDays,
                    item.CurrencyCode.Trim().ToUpperInvariant(),
                    item.QualificationStatus,
                    item.DecisionStatus,
                    NormalizeOptionalGuid(item.OfferFileId),
                    NormalizeOptionalText(item.Notes));
            })
            .OrderBy(x => x.TotalAmount)
            .ToArray();

        var duplicateContractor = result
            .GroupBy(x => x.ContractorId)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicateContractor is not null)
        {
            throw new ArgumentException($"Duplicate contractor '{duplicateContractor.Key}' in offers.");
        }

        return result;
    }

    private static void ValidateRequest(CreateProcedureRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PurchaseTypeCode))
        {
            throw new ArgumentException("PurchaseTypeCode is required.", nameof(request.PurchaseTypeCode));
        }

        if (string.IsNullOrWhiteSpace(request.ObjectName))
        {
            throw new ArgumentException("ObjectName is required.", nameof(request.ObjectName));
        }

        if (string.IsNullOrWhiteSpace(request.WorkScope))
        {
            throw new ArgumentException("WorkScope is required.", nameof(request.WorkScope));
        }

        if (request.PlannedBudgetWithoutVat < 0)
        {
            throw new ArgumentException("PlannedBudgetWithoutVat must be non-negative.", nameof(request.PlannedBudgetWithoutVat));
        }
    }

    private static void ValidateRequest(UpdateProcedureRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PurchaseTypeCode))
        {
            throw new ArgumentException("PurchaseTypeCode is required.", nameof(request.PurchaseTypeCode));
        }

        if (string.IsNullOrWhiteSpace(request.ObjectName))
        {
            throw new ArgumentException("ObjectName is required.", nameof(request.ObjectName));
        }

        if (string.IsNullOrWhiteSpace(request.WorkScope))
        {
            throw new ArgumentException("WorkScope is required.", nameof(request.WorkScope));
        }

        if (request.PlannedBudgetWithoutVat < 0)
        {
            throw new ArgumentException("PlannedBudgetWithoutVat must be non-negative.", nameof(request.PlannedBudgetWithoutVat));
        }
    }

    private static void EnsureTransitionAllowed(
        ProcurementProcedureStatus current,
        ProcurementProcedureStatus target,
        string? reason)
    {
        var isRollback = false;
        var allowed = current switch
        {
            ProcurementProcedureStatus.Created =>
                target is ProcurementProcedureStatus.DocumentsPreparation or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.DocumentsPreparation =>
                target is ProcurementProcedureStatus.Created
                    or ProcurementProcedureStatus.OnApproval
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.OnApproval =>
                target is ProcurementProcedureStatus.DocumentsPreparation
                    or ProcurementProcedureStatus.Sent
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.Sent =>
                target is ProcurementProcedureStatus.OnApproval
                    or ProcurementProcedureStatus.OffersReceived
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.OffersReceived =>
                target is ProcurementProcedureStatus.DecisionMade
                    or ProcurementProcedureStatus.Retender
                    or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.Retender =>
                target is ProcurementProcedureStatus.Sent or ProcurementProcedureStatus.Canceled,
            ProcurementProcedureStatus.DecisionMade =>
                target is ProcurementProcedureStatus.Completed
                    or ProcurementProcedureStatus.Retender
                    or ProcurementProcedureStatus.Canceled,
            _ => false
        };

        if (!allowed)
        {
            throw new InvalidOperationException($"Transition {current} -> {target} is not allowed in current phase.");
        }

        if ((int)target < (int)current || target == ProcurementProcedureStatus.Canceled)
        {
            isRollback = true;
        }

        if (isRollback && string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("Reason is required for rollback/cancel transitions.", nameof(reason));
        }
    }

    private static void ApplyValues(ProcurementProcedure entity, CreateProcedureRequest request)
    {
        entity.RequestDate = request.RequestDate;
        entity.PurchaseTypeCode = request.PurchaseTypeCode.Trim().ToUpperInvariant();
        entity.InitiatorUserId = request.InitiatorUserId;
        entity.ResponsibleCommercialUserId = request.ResponsibleCommercialUserId;
        entity.ObjectName = request.ObjectName.Trim();
        entity.WorkScope = request.WorkScope.Trim();
        entity.CustomerName = request.CustomerName.Trim();
        entity.LeadOfficeCode = request.LeadOfficeCode.Trim().ToUpperInvariant();
        entity.AnalyticsLevel1Code = request.AnalyticsLevel1Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel2Code = request.AnalyticsLevel2Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel3Code = request.AnalyticsLevel3Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel4Code = request.AnalyticsLevel4Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel5Code = request.AnalyticsLevel5Code.Trim().ToUpperInvariant();
        entity.CustomerContractNumber = request.CustomerContractNumber?.Trim();
        entity.CustomerContractDate = request.CustomerContractDate;
        entity.RequiredSubcontractorDeadline = request.RequiredSubcontractorDeadline;
        entity.ProposalDueDate = request.ProposalDueDate;
        entity.PlannedBudgetWithoutVat = request.PlannedBudgetWithoutVat;
        entity.Notes = request.Notes?.Trim();
        entity.ApprovalMode = request.ApprovalMode;
        entity.ApprovalRouteCode = request.ApprovalRouteCode?.Trim();
        entity.ContainsConfidentialInfo = request.ContainsConfidentialInfo;
        entity.RequiresTechnicalNegotiations = request.RequiresTechnicalNegotiations;
    }

    private static void ApplyValues(ProcurementProcedure entity, UpdateProcedureRequest request)
    {
        entity.RequestDate = request.RequestDate;
        entity.PurchaseTypeCode = request.PurchaseTypeCode.Trim().ToUpperInvariant();
        entity.InitiatorUserId = request.InitiatorUserId;
        entity.ResponsibleCommercialUserId = request.ResponsibleCommercialUserId;
        entity.ObjectName = request.ObjectName.Trim();
        entity.WorkScope = request.WorkScope.Trim();
        entity.CustomerName = request.CustomerName.Trim();
        entity.LeadOfficeCode = request.LeadOfficeCode.Trim().ToUpperInvariant();
        entity.AnalyticsLevel1Code = request.AnalyticsLevel1Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel2Code = request.AnalyticsLevel2Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel3Code = request.AnalyticsLevel3Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel4Code = request.AnalyticsLevel4Code.Trim().ToUpperInvariant();
        entity.AnalyticsLevel5Code = request.AnalyticsLevel5Code.Trim().ToUpperInvariant();
        entity.CustomerContractNumber = request.CustomerContractNumber?.Trim();
        entity.CustomerContractDate = request.CustomerContractDate;
        entity.RequiredSubcontractorDeadline = request.RequiredSubcontractorDeadline;
        entity.ProposalDueDate = request.ProposalDueDate;
        entity.PlannedBudgetWithoutVat = request.PlannedBudgetWithoutVat;
        entity.Notes = request.Notes?.Trim();
        entity.ApprovalMode = request.ApprovalMode;
        entity.ApprovalRouteCode = request.ApprovalRouteCode?.Trim();
        entity.ContainsConfidentialInfo = request.ContainsConfidentialInfo;
        entity.RequiresTechnicalNegotiations = request.RequiresTechnicalNegotiations;
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

    private static ProcedureStatusHistoryItemDto ToHistoryDto(ProcurementProcedureStatusHistory history)
    {
        return new ProcedureStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
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

    private sealed record NormalizedApprovalStep(
        int StepOrder,
        string StepTitle,
        Guid? ApproverUserId,
        string? ApproverRoleName,
        bool IsRequired);

    private sealed record NormalizedShortlistItem(
        Guid ContractorId,
        bool IsIncluded,
        int SortOrder,
        string? ExclusionReason,
        string? Notes);

    private sealed record NormalizedOfferItem(
        Guid ContractorId,
        string OfferNumber,
        DateTime? ReceivedDate,
        decimal AmountWithoutVat,
        decimal VatAmount,
        decimal TotalAmount,
        int? DurationDays,
        string CurrencyCode,
        ProcedureOfferQualificationStatus QualificationStatus,
        ProcedureOfferDecisionStatus DecisionStatus,
        Guid? OfferFileId,
        string? Notes);

    private sealed record ShortlistRecommendationCandidate(
        Guid ContractorId,
        string ContractorName,
        bool IsRecommended,
        decimal Score,
        ContractorStatus ContractorStatus,
        ReliabilityClass ReliabilityClass,
        decimal CurrentRating,
        decimal CurrentLoadPercent,
        bool HasRequiredQualifications,
        IReadOnlyList<string> MissingDisciplineCodes,
        IReadOnlyList<string> DecisionFactors);
}
