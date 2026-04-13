using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

public sealed class ProcurementProceduresService : IProcurementProceduresService
{
    private readonly ProcedureLifecycleService _lifecycleService;
    private readonly ProcedureStatusMutationService _statusMutationService;
    private readonly ProcedureTransitionWorkflowService _transitionWorkflowService;
    private readonly ProcedureShortlistWorkflowService _shortlistWorkflowService;
    private readonly ProcedureShortlistOrchestrationService _shortlistOrchestrationService;
    private readonly ProcedureApprovalWorkflowService _approvalWorkflowService;
    private readonly ProcedureExternalApprovalWorkflowService _externalApprovalWorkflowService;
    private readonly ProcedureOffersWorkflowService _offersWorkflowService;
    private readonly ProcedureOutcomeWorkflowService _outcomeWorkflowService;
    private readonly ProcedureAttachmentBindingService _attachmentBindingService;
    private readonly ProcedureLotWorkflowService _lotWorkflowService;

    internal ProcurementProceduresService(
        ProcedureLifecycleService lifecycleService,
        ProcedureStatusMutationService statusMutationService,
        ProcedureTransitionWorkflowService transitionWorkflowService,
        ProcedureShortlistWorkflowService shortlistWorkflowService,
        ProcedureShortlistOrchestrationService shortlistOrchestrationService,
        ProcedureApprovalWorkflowService approvalWorkflowService,
        ProcedureExternalApprovalWorkflowService externalApprovalWorkflowService,
        ProcedureOffersWorkflowService offersWorkflowService,
        ProcedureOutcomeWorkflowService outcomeWorkflowService,
        ProcedureAttachmentBindingService attachmentBindingService,
        ProcedureLotWorkflowService lotWorkflowService)
    {
        _lifecycleService = lifecycleService ?? throw new ArgumentNullException(nameof(lifecycleService));
        _statusMutationService = statusMutationService ?? throw new ArgumentNullException(nameof(statusMutationService));
        _transitionWorkflowService = transitionWorkflowService ?? throw new ArgumentNullException(nameof(transitionWorkflowService));
        _shortlistWorkflowService = shortlistWorkflowService ?? throw new ArgumentNullException(nameof(shortlistWorkflowService));
        _shortlistOrchestrationService = shortlistOrchestrationService ?? throw new ArgumentNullException(nameof(shortlistOrchestrationService));
        _approvalWorkflowService = approvalWorkflowService ?? throw new ArgumentNullException(nameof(approvalWorkflowService));
        _externalApprovalWorkflowService = externalApprovalWorkflowService ?? throw new ArgumentNullException(nameof(externalApprovalWorkflowService));
        _offersWorkflowService = offersWorkflowService ?? throw new ArgumentNullException(nameof(offersWorkflowService));
        _outcomeWorkflowService = outcomeWorkflowService ?? throw new ArgumentNullException(nameof(outcomeWorkflowService));
        _attachmentBindingService = attachmentBindingService ?? throw new ArgumentNullException(nameof(attachmentBindingService));
        _lotWorkflowService = lotWorkflowService ?? throw new ArgumentNullException(nameof(lotWorkflowService));
    }

    public ProcurementProceduresService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IContractorsService? contractorsService = null)
    {
        _attachmentBindingService = new ProcedureAttachmentBindingService(dbContext);
        _statusMutationService = new ProcedureStatusMutationService(dbContext);
        _lifecycleService = new ProcedureLifecycleService(dbContext, _attachmentBindingService);
        _shortlistWorkflowService = new ProcedureShortlistWorkflowService(dbContext);
        _shortlistOrchestrationService = new ProcedureShortlistOrchestrationService(dbContext, contractorsService);
        _approvalWorkflowService = new ProcedureApprovalWorkflowService(dbContext, currentUserService);
        _externalApprovalWorkflowService = new ProcedureExternalApprovalWorkflowService(dbContext);
        _offersWorkflowService = new ProcedureOffersWorkflowService(dbContext);
        _outcomeWorkflowService = new ProcedureOutcomeWorkflowService(dbContext);
        _lotWorkflowService = new ProcedureLotWorkflowService(dbContext);
        _transitionWorkflowService = new ProcedureTransitionWorkflowService(
            dbContext,
            _approvalWorkflowService,
            _lotWorkflowService,
            _statusMutationService);
    }

    public async Task<IReadOnlyList<ProcedureListItemDto>> ListAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        CancellationToken cancellationToken = default)
    {
        return await _lifecycleService.ListAsync(search, status, lotId, cancellationToken);
    }

    public async Task<ProcedureListPageDto> ListPageAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        return await _lifecycleService.ListPageAsync(
            search,
            status,
            lotId,
            skip,
            take,
            cancellationToken);
    }

    public async Task<ProcedureDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _lifecycleService.GetByIdAsync(id, cancellationToken);
    }

    public async Task<ProcedureDetailsDto> CreateAsync(CreateProcedureRequest request, CancellationToken cancellationToken = default)
    {
        return await _lifecycleService.CreateAsync(request, cancellationToken);
    }

    public async Task<ProcedureDetailsDto?> UpdateAsync(Guid id, UpdateProcedureRequest request, CancellationToken cancellationToken = default)
    {
        return await _lifecycleService.UpdateAsync(id, request, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _lifecycleService.DeleteAsync(id, cancellationToken);
    }

    public async Task<ProcedureStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        ProcedureStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _transitionWorkflowService.TransitionAsync(id, request, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureStatusHistoryItemDto>> GetHistoryAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _lifecycleService.GetHistoryAsync(procedureId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureApprovalStepDto>> GetApprovalStepsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _approvalWorkflowService.GetApprovalStepsAsync(procedureId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureApprovalStepDto>> ConfigureApprovalStepsAsync(
        Guid procedureId,
        ConfigureProcedureApprovalRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _approvalWorkflowService.ConfigureApprovalStepsAsync(
            procedureId,
            request,
            _statusMutationService.UpdateProcedureStatusAsync,
            cancellationToken);
    }

    public async Task<ProcedureApprovalStepDto?> DecideApprovalStepAsync(
        Guid procedureId,
        Guid stepId,
        DecideProcedureApprovalStepRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _approvalWorkflowService.DecideApprovalStepAsync(
            procedureId,
            stepId,
            request,
            _statusMutationService.UpdateProcedureStatusAsync,
            cancellationToken);
    }

    public async Task<ProcedureExternalApprovalDto> GetExternalApprovalAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _externalApprovalWorkflowService.GetExternalApprovalAsync(procedureId, cancellationToken);
    }

    public async Task<ProcedureExternalApprovalDto> UpsertExternalApprovalAsync(
        Guid procedureId,
        UpsertProcedureExternalApprovalRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _externalApprovalWorkflowService.UpsertExternalApprovalAsync(
            procedureId,
            request,
            _attachmentBindingService.RebindExternalApprovalProtocolAsync,
            _statusMutationService.UpdateProcedureStatusAsync,
            cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureShortlistItemDto>> GetShortlistAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _shortlistWorkflowService.GetShortlistAsync(procedureId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureShortlistItemDto>> UpsertShortlistAsync(
        Guid procedureId,
        UpdateProcedureShortlistRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _shortlistWorkflowService.UpsertShortlistAsync(procedureId, request, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureShortlistRecommendationDto>> BuildShortlistRecommendationsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _shortlistOrchestrationService.BuildShortlistRecommendationsAsync(procedureId, cancellationToken);
    }

    public async Task<ApplyProcedureShortlistRecommendationsResultDto> ApplyShortlistRecommendationsAsync(
        Guid procedureId,
        ApplyProcedureShortlistRecommendationsRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _shortlistOrchestrationService.ApplyShortlistRecommendationsAsync(
            procedureId,
            request,
            UpsertShortlistAsync,
            cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>> GetShortlistAdjustmentsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _shortlistOrchestrationService.GetShortlistAdjustmentsAsync(procedureId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureOfferDto>> GetOffersAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _offersWorkflowService.GetOffersAsync(procedureId, cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureOfferDto>> UpsertOffersAsync(
        Guid procedureId,
        UpdateProcedureOffersRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _offersWorkflowService.UpsertOffersAsync(
            procedureId,
            request,
            _attachmentBindingService.RebindOfferFilesAsync,
            _statusMutationService.UpdateProcedureStatusAsync,
            cancellationToken);
    }

    public async Task<IReadOnlyList<ProcedureComparisonRowDto>> GetComparisonAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _offersWorkflowService.GetComparisonAsync(procedureId, cancellationToken);
    }

    public async Task<ProcedureOutcomeDto> GetOutcomeAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default)
    {
        return await _outcomeWorkflowService.GetOutcomeAsync(procedureId, cancellationToken);
    }

    public async Task<ProcedureOutcomeDto> UpsertOutcomeAsync(
        Guid procedureId,
        UpdateProcedureOutcomeRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _outcomeWorkflowService.UpsertOutcomeAsync(
            procedureId,
            request,
            _attachmentBindingService.RebindOutcomeProtocolAsync,
            _statusMutationService.UpdateProcedureStatusAsync,
            _lotWorkflowService.SyncLotStatusAsync,
            cancellationToken);
    }
}
