using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Contracts;

internal sealed class ContractLifecycleWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ContractLifecycleWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ContractDetailsDto> CreateAsync(
        CreateContractRequest request,
        CancellationToken cancellationToken)
    {
        ContractRequestValidationPolicy.ValidateCreateRequest(request);

        var contractNumber = request.ContractNumber.Trim();
        await ContractDataAccessPolicy.EnsureContractNumberAvailableAsync(_dbContext, contractNumber, null, cancellationToken);
        await ContractDataAccessPolicy.EnsureProcedureContractAvailableAsync(_dbContext, request.ProcedureId, null, cancellationToken);

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

        var contract = ContractEntityMutationPolicy.BuildNewContract(request, contractNumber);

        await _dbContext.Set<Contract>().AddAsync(contract, cancellationToken);
        await _dbContext.Set<ContractStatusHistory>().AddAsync(
            ContractEntityMutationPolicy.BuildInitialStatusHistory(contract, "Contract created"),
            cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ContractReadModelProjectionPolicy.ToDetailsDto(contract, contractor.Name);
    }

    public async Task<ContractDetailsDto?> UpdateAsync(
        Guid id,
        UpdateContractRequest request,
        CancellationToken cancellationToken)
    {
        ContractRequestValidationPolicy.ValidateUpdateRequest(request);

        var contract = await _dbContext.Set<Contract>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contract is null)
        {
            return null;
        }

        var contractNumber = request.ContractNumber.Trim();
        await ContractDataAccessPolicy.EnsureContractNumberAvailableAsync(_dbContext, contractNumber, contract.Id, cancellationToken);

        if (request.Status != contract.Status)
        {
            throw new InvalidOperationException("Status cannot be changed via update API. Use transition endpoint.");
        }

        ContractEntityMutationPolicy.ApplyUpdate(contract, request, contractNumber);

        await _dbContext.SaveChangesAsync(cancellationToken);

        var contractorName = await ContractDataAccessPolicy.ResolveContractorNameAsync(_dbContext, contract.ContractorId, cancellationToken);
        return ContractReadModelProjectionPolicy.ToDetailsDto(contract, contractorName);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
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
        CancellationToken cancellationToken)
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

        ContractTransitionPolicy.EnsureTransitionAllowed(contract.Status, request.TargetStatus, request.Reason);
        ContractTransitionPolicy.EnsureTransitionStateData(contract, request.TargetStatus);
        if (request.TargetStatus == ContractStatus.Closed)
        {
            await ContractDataAccessPolicy.EnsureNoOverdueMilestonesBeforeCloseAsync(_dbContext, contract.Id, cancellationToken);
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
        return ContractReadModelProjectionPolicy.ToHistoryDto(history);
    }

    public async Task<ContractDetailsDto> CreateDraftFromProcedureAsync(
        Guid procedureId,
        CreateContractDraftFromProcedureRequest request,
        CancellationToken cancellationToken)
    {
        ContractRequestValidationPolicy.ValidateDraftRequest(request);
        await ContractDataAccessPolicy.EnsureProcedureContractAvailableAsync(_dbContext, procedureId, null, cancellationToken);

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
            ? await ContractDataAccessPolicy.GenerateDraftContractNumberAsync(_dbContext, procedureId, cancellationToken)
            : request.ContractNumber.Trim();

        await ContractDataAccessPolicy.EnsureContractNumberAvailableAsync(_dbContext, contractNumber, null, cancellationToken);

        var contract = ContractEntityMutationPolicy.BuildDraftContract(
            procedure,
            winnerOffer,
            winnerContractorId,
            request,
            contractNumber);

        await _dbContext.Set<Contract>().AddAsync(contract, cancellationToken);
        await _dbContext.Set<ContractStatusHistory>().AddAsync(
            ContractEntityMutationPolicy.BuildInitialStatusHistory(contract, "Draft generated from procedure outcome"),
            cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ContractReadModelProjectionPolicy.ToDetailsDto(contract, contractor.Name);
    }
}
