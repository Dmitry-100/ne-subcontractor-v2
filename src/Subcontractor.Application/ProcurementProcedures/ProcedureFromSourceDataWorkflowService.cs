using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Projects;

namespace Subcontractor.Application.ProcurementProcedures;

internal sealed class ProcedureFromSourceDataWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ProcedureAttachmentBindingService _attachmentBindingService;

    public ProcedureFromSourceDataWorkflowService(
        IApplicationDbContext dbContext,
        ProcedureAttachmentBindingService attachmentBindingService)
    {
        _dbContext = dbContext;
        _attachmentBindingService = attachmentBindingService;
    }

    public async Task<ProcedureFromSourceDataResultDto> CreateFromSourceDataAsync(
        CreateProcedureFromSourceDataRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var rowIds = NormalizeRowIds(request.SourceDataRowIds);
        if (rowIds.Count == 0)
        {
            throw new ArgumentException("Select at least one source-data row.", nameof(request.SourceDataRowIds));
        }

        if (request.TechnicalAssignmentFileId == Guid.Empty)
        {
            throw new ArgumentException("Technical assignment file is required.", nameof(request.TechnicalAssignmentFileId));
        }

        var rows = await _dbContext.Set<SourceDataImportRow>()
            .AsNoTracking()
            .Where(x => rowIds.Contains(x.Id))
            .OrderBy(x => x.ProjectCode)
            .ThenBy(x => x.ObjectWbs)
            .ThenBy(x => x.RowNumber)
            .ToArrayAsync(cancellationToken);
        if (rows.Length != rowIds.Count)
        {
            throw new ArgumentException("One or more selected source-data rows were not found.", nameof(request.SourceDataRowIds));
        }

        if (rows.Any(x => !x.IsValid))
        {
            throw new InvalidOperationException("Only valid source-data rows can be added to a procurement request.");
        }

        var projectCodes = rows
            .Select(x => x.ProjectCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var projects = await _dbContext.Set<Project>()
            .AsNoTracking()
            .Where(x => projectCodes.Contains(x.Code))
            .ToDictionaryAsync(x => x.Code, x => x.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);
        if (projects.Count != projectCodes.Length)
        {
            throw new InvalidOperationException("One or more selected rows cannot be mapped to imported projects.");
        }

        var totalManHours = rows.Sum(x => x.ManHours);
        var lot = new Lot
        {
            Code = await BuildLotCodeAsync(request.LotCode, rows, cancellationToken),
            Name = BuildLotName(request.LotName, rows),
            Status = LotStatus.InProcurement
        };

        foreach (var row in rows)
        {
            lot.Items.Add(new LotItem
            {
                ProjectId = projects[row.ProjectCode],
                ObjectWbs = row.ObjectWbs,
                DisciplineCode = row.DisciplineCode,
                ManHours = row.ManHours,
                PlannedStartDate = row.PlannedStartDate,
                PlannedFinishDate = row.PlannedFinishDate
            });
        }

        var procedure = new ProcurementProcedure
        {
            LotId = lot.Id,
            Status = ProcurementProcedureStatus.Created,
            PurchaseTypeCode = NormalizePurchaseType(request.PurchaseTypeCode),
            ObjectName = BuildRequestTitle(request.RequestTitle, rows),
            WorkScope = BuildWorkScope(request.WorkScope, rows),
            RequiredSubcontractorDeadline = request.RequiredSubcontractorDeadline,
            ResponsibleCommercialUserId = request.ResponsibleCommercialUserId,
            RequestDate = DateTime.UtcNow.Date,
            Notes = request.Notes?.Trim()
        };

        await _dbContext.Set<Lot>().AddAsync(lot, cancellationToken);
        await _dbContext.Set<LotStatusHistory>().AddRangeAsync(
            new LotStatusHistory
            {
                LotId = lot.Id,
                FromStatus = null,
                ToStatus = LotStatus.Draft,
                Reason = "Lot created from selected source-data rows."
            },
            new LotStatusHistory
            {
                LotId = lot.Id,
                FromStatus = LotStatus.Draft,
                ToStatus = LotStatus.InProcurement,
                Reason = "Procurement request formed from selected source-data rows."
            });
        await _dbContext.Set<ProcurementProcedure>().AddAsync(procedure, cancellationToken);
        await _dbContext.Set<ProcurementProcedureStatusHistory>().AddAsync(new ProcurementProcedureStatusHistory
        {
            ProcedureId = procedure.Id,
            FromStatus = null,
            ToStatus = ProcurementProcedureStatus.Created,
            Reason = "Procedure created from source-data rows."
        }, cancellationToken);

        foreach (var row in rows)
        {
            await _dbContext.Set<ProcurementProcedureSourceDataRow>().AddAsync(new ProcurementProcedureSourceDataRow
            {
                ProcedureId = procedure.Id,
                SourceDataImportRowId = row.Id
            }, cancellationToken);
        }

        await _attachmentBindingService.RebindRequestAttachmentsAsync(
            procedure.Id,
            [request.TechnicalAssignmentFileId],
            cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var attachments = await _attachmentBindingService.LoadRequestAttachmentsAsync(procedure.Id, cancellationToken);
        var details = ToDetailsDto(procedure, attachments);
        return new ProcedureFromSourceDataResultDto(
            procedure.Id,
            lot.Id,
            rows.Length,
            totalManHours,
            details);
    }

    private async Task<string> BuildLotCodeAsync(
        string? requestedLotCode,
        IReadOnlyList<SourceDataImportRow> rows,
        CancellationToken cancellationToken)
    {
        var baseCode = string.IsNullOrWhiteSpace(requestedLotCode)
            ? $"REQ-{rows[0].ProjectCode}-{DateTime.UtcNow:yyyyMMddHHmmss}"
            : requestedLotCode.Trim().ToUpperInvariant();
        var candidate = baseCode;
        var suffix = 1;
        while (await _dbContext.Lots.AnyAsync(x => x.Code == candidate, cancellationToken))
        {
            suffix++;
            candidate = $"{baseCode}-{suffix}";
        }

        return candidate;
    }

    private static HashSet<Guid> NormalizeRowIds(IReadOnlyCollection<Guid>? rowIds)
    {
        return (rowIds ?? Array.Empty<Guid>())
            .Where(x => x != Guid.Empty)
            .ToHashSet();
    }

    private static string NormalizePurchaseType(string? purchaseTypeCode)
    {
        var normalized = purchaseTypeCode?.Trim();
        return string.IsNullOrWhiteSpace(normalized)
            ? "SUBCONTRACT"
            : normalized.ToUpperInvariant();
    }

    private static string BuildLotName(string? requestedLotName, IReadOnlyList<SourceDataImportRow> rows)
    {
        if (!string.IsNullOrWhiteSpace(requestedLotName))
        {
            return requestedLotName.Trim();
        }

        var projectCodes = string.Join(", ", rows.Select(x => x.ProjectCode).Distinct(StringComparer.OrdinalIgnoreCase));
        return $"Заявка на закупку: {projectCodes}, работ: {rows.Count}";
    }

    private static string BuildRequestTitle(string? requestedTitle, IReadOnlyList<SourceDataImportRow> rows)
    {
        if (!string.IsNullOrWhiteSpace(requestedTitle))
        {
            return requestedTitle.Trim();
        }

        var first = rows[0];
        var projectName = string.IsNullOrWhiteSpace(first.ProjectName) ? first.ProjectCode : first.ProjectName;
        return $"Закупка субподряда: {projectName}, {rows.Count} работ";
    }

    private static string BuildWorkScope(string? requestedWorkScope, IReadOnlyList<SourceDataImportRow> rows)
    {
        if (!string.IsNullOrWhiteSpace(requestedWorkScope))
        {
            return requestedWorkScope.Trim();
        }

        var grouped = rows
            .GroupBy(x => x.DisciplineCode)
            .Select(x => $"{x.Key}: {x.Count()} работ, {x.Sum(row => row.ManHours):0.##} чел.-ч");
        return string.Join("; ", grouped);
    }

    private static ProcedureDetailsDto ToDetailsDto(
        ProcurementProcedure entity,
        IReadOnlyCollection<ProcedureAttachmentDto> attachments)
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
}
