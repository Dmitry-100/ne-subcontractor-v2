using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureLotWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ProcedureLotWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task EnsureCompletionRequirementsAsync(
        ProcurementProcedure procedure,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(procedure);

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

    public async Task SyncLotStatusAsync(
        Guid lotId,
        LotStatus targetStatus,
        string reason,
        CancellationToken cancellationToken = default)
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
}
