using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureStatusMutationService
{
    private readonly IApplicationDbContext _dbContext;

    public ProcedureStatusMutationService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ProcurementProcedureStatusHistory> UpdateProcedureStatusAsync(
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

    public static ProcedureStatusHistoryItemDto ToHistoryDto(ProcurementProcedureStatusHistory history)
    {
        return new ProcedureStatusHistoryItemDto(
            history.Id,
            history.FromStatus,
            history.ToStatus,
            history.Reason,
            history.CreatedBy,
            history.CreatedAtUtc);
    }
}
