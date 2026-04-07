using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

public interface IProcurementProceduresService
{
    Task<IReadOnlyList<ProcedureListItemDto>> ListAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        CancellationToken cancellationToken = default);

    Task<ProcedureDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProcedureDetailsDto> CreateAsync(CreateProcedureRequest request, CancellationToken cancellationToken = default);
    Task<ProcedureDetailsDto?> UpdateAsync(Guid id, UpdateProcedureRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProcedureStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        ProcedureStatusTransitionRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProcedureStatusHistoryItemDto>> GetHistoryAsync(Guid procedureId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProcedureApprovalStepDto>> GetApprovalStepsAsync(Guid procedureId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProcedureApprovalStepDto>> ConfigureApprovalStepsAsync(
        Guid procedureId,
        ConfigureProcedureApprovalRequest request,
        CancellationToken cancellationToken = default);
    Task<ProcedureApprovalStepDto?> DecideApprovalStepAsync(
        Guid procedureId,
        Guid stepId,
        DecideProcedureApprovalStepRequest request,
        CancellationToken cancellationToken = default);

    Task<ProcedureExternalApprovalDto> GetExternalApprovalAsync(Guid procedureId, CancellationToken cancellationToken = default);
    Task<ProcedureExternalApprovalDto> UpsertExternalApprovalAsync(
        Guid procedureId,
        UpsertProcedureExternalApprovalRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProcedureShortlistItemDto>> GetShortlistAsync(Guid procedureId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProcedureShortlistItemDto>> UpsertShortlistAsync(
        Guid procedureId,
        UpdateProcedureShortlistRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProcedureShortlistRecommendationDto>> BuildShortlistRecommendationsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default);
    Task<ApplyProcedureShortlistRecommendationsResultDto> ApplyShortlistRecommendationsAsync(
        Guid procedureId,
        ApplyProcedureShortlistRecommendationsRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProcedureShortlistAdjustmentLogDto>> GetShortlistAdjustmentsAsync(
        Guid procedureId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProcedureOfferDto>> GetOffersAsync(Guid procedureId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProcedureOfferDto>> UpsertOffersAsync(
        Guid procedureId,
        UpdateProcedureOffersRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProcedureComparisonRowDto>> GetComparisonAsync(Guid procedureId, CancellationToken cancellationToken = default);

    Task<ProcedureOutcomeDto> GetOutcomeAsync(Guid procedureId, CancellationToken cancellationToken = default);
    Task<ProcedureOutcomeDto> UpsertOutcomeAsync(
        Guid procedureId,
        UpdateProcedureOutcomeRequest request,
        CancellationToken cancellationToken = default);
}
