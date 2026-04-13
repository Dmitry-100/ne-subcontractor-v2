using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureTransitionWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ProcedureApprovalWorkflowService _approvalWorkflowService;
    private readonly ProcedureLotWorkflowService _lotWorkflowService;
    private readonly ProcedureStatusMutationService _statusMutationService;

    public ProcedureTransitionWorkflowService(
        IApplicationDbContext dbContext,
        ProcedureApprovalWorkflowService approvalWorkflowService,
        ProcedureLotWorkflowService lotWorkflowService,
        ProcedureStatusMutationService statusMutationService)
    {
        _dbContext = dbContext;
        _approvalWorkflowService = approvalWorkflowService;
        _lotWorkflowService = lotWorkflowService;
        _statusMutationService = statusMutationService;
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

        ProcedureTransitionPolicy.EnsureTransitionAllowed(procedure.Status, request.TargetStatus, request.Reason);
        if (request.TargetStatus == ProcurementProcedureStatus.OnApproval)
        {
            await _approvalWorkflowService.PrepareForApprovalAsync(procedure, cancellationToken);
        }

        if (request.TargetStatus == ProcurementProcedureStatus.Completed)
        {
            await _lotWorkflowService.EnsureCompletionRequirementsAsync(procedure, cancellationToken);
        }

        var reason = request.Reason?.Trim() ?? string.Empty;
        var history = await _statusMutationService.UpdateProcedureStatusAsync(
            procedure,
            request.TargetStatus,
            reason,
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ProcedureStatusMutationService.ToHistoryDto(history);
    }
}
