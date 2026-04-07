using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

public interface IContractsService
{
    Task<IReadOnlyList<ContractListItemDto>> ListAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        CancellationToken cancellationToken = default);

    Task<ContractDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ContractDetailsDto> CreateAsync(CreateContractRequest request, CancellationToken cancellationToken = default);
    Task<ContractDetailsDto?> UpdateAsync(Guid id, UpdateContractRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ContractStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        ContractStatusTransitionRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractStatusHistoryItemDto>> GetHistoryAsync(Guid contractId, CancellationToken cancellationToken = default);
    Task<ContractExecutionSummaryDto> GetExecutionSummaryAsync(Guid contractId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractMilestoneDto>> GetMilestonesAsync(Guid contractId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractMilestoneDto>> UpsertMilestonesAsync(
        Guid contractId,
        UpdateContractMilestonesRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractMonitoringControlPointDto>> GetMonitoringControlPointsAsync(
        Guid contractId,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractMonitoringControlPointDto>> UpsertMonitoringControlPointsAsync(
        Guid contractId,
        UpdateContractMonitoringControlPointsRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractMdrCardDto>> GetMdrCardsAsync(
        Guid contractId,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ContractMdrCardDto>> UpsertMdrCardsAsync(
        Guid contractId,
        UpdateContractMdrCardsRequest request,
        CancellationToken cancellationToken = default);
    Task<ImportContractMdrForecastFactResultDto> ImportMdrForecastFactAsync(
        Guid contractId,
        ImportContractMdrForecastFactRequest request,
        CancellationToken cancellationToken = default);

    Task<ContractDetailsDto> CreateDraftFromProcedureAsync(
        Guid procedureId,
        CreateContractDraftFromProcedureRequest request,
        CancellationToken cancellationToken = default);
}
