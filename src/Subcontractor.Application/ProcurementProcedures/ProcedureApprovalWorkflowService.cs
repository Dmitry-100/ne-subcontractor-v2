using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureApprovalWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public ProcedureApprovalWorkflowService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
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
        Func<ProcurementProcedure, ProcurementProcedureStatus, string, CancellationToken, Task<ProcurementProcedureStatusHistory>> updateProcedureStatusAsync,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(updateProcedureStatusAsync);

        var procedure = await EnsureProcedureExistsAsync(procedureId, cancellationToken);
        if (procedure.ApprovalMode != ProcedureApprovalMode.InSystem)
        {
            throw new InvalidOperationException("Approval steps are available only for in-system approval mode.");
        }

        if (procedure.Status is not (ProcurementProcedureStatus.Created or ProcurementProcedureStatus.DocumentsPreparation or ProcurementProcedureStatus.OnApproval))
        {
            throw new InvalidOperationException("Approval route can be configured only for draft/on-approval procedures.");
        }

        var normalizedSteps = ProcedureApprovalStepNormalizationPolicy.Normalize(request.Steps);
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
            await updateProcedureStatusAsync(
                procedure,
                ProcurementProcedureStatus.DocumentsPreparation,
                "Approval route configured",
                cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetApprovalStepsAsync(procedureId, cancellationToken);
    }

    public async Task<ProcedureApprovalStepDto?> DecideApprovalStepAsync(
        Guid procedureId,
        Guid stepId,
        DecideProcedureApprovalStepRequest request,
        Func<ProcurementProcedure, ProcurementProcedureStatus, string, CancellationToken, Task<ProcurementProcedureStatusHistory>> updateProcedureStatusAsync,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(updateProcedureStatusAsync);

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
                await updateProcedureStatusAsync(
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

            await updateProcedureStatusAsync(
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

    public async Task PrepareForApprovalAsync(
        ProcurementProcedure procedure,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(procedure);

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

    private async Task<ProcurementProcedure> EnsureProcedureExistsAsync(Guid procedureId, CancellationToken cancellationToken)
    {
        var procedure = await _dbContext.Set<ProcurementProcedure>()
            .FirstOrDefaultAsync(x => x.Id == procedureId, cancellationToken);
        return procedure ?? throw new KeyNotFoundException($"Procedure '{procedureId}' not found.");
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

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
