using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

public sealed class ContractsService : IContractsService
{
    private readonly ContractReadQueryService _readQueryService;
    private readonly ContractExecutionWorkflowService _executionWorkflowService;
    private readonly ContractLifecycleWorkflowService _lifecycleWorkflowService;

    public ContractsService(IApplicationDbContext dbContext)
    {
        var readQueryService = new ContractReadQueryService(dbContext);
        _readQueryService = readQueryService;
        _executionWorkflowService = new ContractExecutionWorkflowService(dbContext, readQueryService);
        _lifecycleWorkflowService = new ContractLifecycleWorkflowService(dbContext);
    }

    internal ContractsService(
        ContractReadQueryService readQueryService,
        ContractExecutionWorkflowService executionWorkflowService,
        ContractLifecycleWorkflowService lifecycleWorkflowService)
    {
        _readQueryService = readQueryService;
        _executionWorkflowService = executionWorkflowService;
        _lifecycleWorkflowService = lifecycleWorkflowService;
    }

    public async Task<IReadOnlyList<ContractListItemDto>> ListAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListAsync(
            search,
            status,
            lotId,
            procedureId,
            contractorId,
            cancellationToken);
    }

    public async Task<ContractListPageDto> ListPageAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListPageAsync(
            search,
            status,
            lotId,
            procedureId,
            contractorId,
            skip,
            take,
            cancellationToken);
    }

    public async Task<ContractDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetByIdAsync(id, cancellationToken);
    }

    public async Task<ContractDetailsDto> CreateAsync(CreateContractRequest request, CancellationToken cancellationToken = default)
    {
        return await _lifecycleWorkflowService.CreateAsync(request, cancellationToken);
    }

    public async Task<ContractDetailsDto?> UpdateAsync(Guid id, UpdateContractRequest request, CancellationToken cancellationToken = default)
    {
        return await _lifecycleWorkflowService.UpdateAsync(id, request, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _lifecycleWorkflowService.DeleteAsync(id, cancellationToken);
    }

    public async Task<ContractStatusHistoryItemDto?> TransitionAsync(
        Guid id,
        ContractStatusTransitionRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _lifecycleWorkflowService.TransitionAsync(id, request, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractStatusHistoryItemDto>> GetHistoryAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetHistoryAsync(contractId, cancellationToken);
    }

    public async Task<ContractExecutionSummaryDto> GetExecutionSummaryAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetExecutionSummaryAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMilestoneDto>> GetMilestonesAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetMilestonesAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMilestoneDto>> UpsertMilestonesAsync(
        Guid contractId,
        UpdateContractMilestonesRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _executionWorkflowService.UpsertMilestonesAsync(contractId, request, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMonitoringControlPointDto>> GetMonitoringControlPointsAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetMonitoringControlPointsAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMonitoringControlPointDto>> UpsertMonitoringControlPointsAsync(
        Guid contractId,
        UpdateContractMonitoringControlPointsRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _executionWorkflowService.UpsertMonitoringControlPointsAsync(contractId, request, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMdrCardDto>> GetMdrCardsAsync(
        Guid contractId,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetMdrCardsAsync(contractId, cancellationToken);
    }

    public async Task<IReadOnlyList<ContractMdrCardDto>> UpsertMdrCardsAsync(
        Guid contractId,
        UpdateContractMdrCardsRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _executionWorkflowService.UpsertMdrCardsAsync(contractId, request, cancellationToken);
    }

    public async Task<ImportContractMdrForecastFactResultDto> ImportMdrForecastFactAsync(
        Guid contractId,
        ImportContractMdrForecastFactRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _executionWorkflowService.ImportMdrForecastFactAsync(contractId, request, cancellationToken);
    }

    public async Task<ContractDetailsDto> CreateDraftFromProcedureAsync(
        Guid procedureId,
        CreateContractDraftFromProcedureRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _lifecycleWorkflowService.CreateDraftFromProcedureAsync(procedureId, request, cancellationToken);
    }
}
