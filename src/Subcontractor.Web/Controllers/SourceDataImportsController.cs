using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/imports/source-data/batches")]
public sealed class SourceDataImportsController : ApiControllerBase
{
    private readonly ISourceDataImportsService _sourceDataImportsService;

    public SourceDataImportsController(ISourceDataImportsService sourceDataImportsService)
    {
        _sourceDataImportsService = sourceDataImportsService;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<ActionResult<IReadOnlyList<SourceDataImportBatchListItemDto>>> List(CancellationToken cancellationToken)
    {
        var result = await _sourceDataImportsService.ListBatchesAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<ActionResult<SourceDataImportBatchDetailsDto>> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _sourceDataImportsService.GetBatchByIdAsync(id, cancellationToken);
        return result is null
            ? NotFoundProblem($"Пакет импорта '{id}' не найден.")
            : Ok(result);
    }

    [HttpGet("template")]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public IActionResult DownloadTemplate()
    {
        const string content =
            "RowNumber,ProjectCode,ObjectWbs,DisciplineCode,ManHours,PlannedStartDate,PlannedFinishDate\n" +
            "1,PRJ-001,A.01.02,PIPING,240.5,2026-09-10,2026-10-05\n";

        return File(
            Encoding.UTF8.GetBytes(content),
            "text/csv",
            "source-data-template.csv");
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.ImportsWrite)]
    public async Task<ActionResult<SourceDataImportBatchDetailsDto>> Create(
        [FromBody] CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _sourceDataImportsService.CreateBatchAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("queued")]
    [Authorize(Policy = PolicyCodes.ImportsWrite)]
    public async Task<ActionResult<SourceDataImportBatchDetailsDto>> CreateQueued(
        [FromBody] CreateSourceDataImportBatchRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _sourceDataImportsService.CreateBatchQueuedAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/transition")]
    [Authorize(Policy = PolicyCodes.ImportsWrite)]
    public async Task<ActionResult<SourceDataImportBatchStatusHistoryItemDto>> Transition(
        [FromRoute] Guid id,
        [FromBody] SourceDataImportBatchStatusTransitionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _sourceDataImportsService.TransitionBatchStatusAsync(id, request, cancellationToken);
            return result is null
                ? NotFoundProblem($"Пакет импорта '{id}' не найден.")
                : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpGet("{id:guid}/history")]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<ActionResult<IReadOnlyList<SourceDataImportBatchStatusHistoryItemDto>>> History(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _sourceDataImportsService.GetBatchHistoryAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}/validation-report")]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<IActionResult> DownloadValidationReport(
        [FromRoute] Guid id,
        [FromQuery] bool includeValidRows = false,
        CancellationToken cancellationToken = default)
    {
        var report = await _sourceDataImportsService.GetValidationReportAsync(id, includeValidRows, cancellationToken);
        if (report is null)
        {
            return NotFoundProblem($"Пакет импорта '{id}' не найден.");
        }

        return File(
            Encoding.UTF8.GetBytes(report.CsvContent),
            "text/csv",
            report.FileName);
    }

    [HttpGet("{id:guid}/lot-reconciliation-report")]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<IActionResult> DownloadLotReconciliationReport(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default)
    {
        var report = await _sourceDataImportsService.GetLotReconciliationReportAsync(id, cancellationToken);
        if (report is null)
        {
            return NotFoundProblem($"Пакет импорта '{id}' не найден.");
        }

        return File(
            Encoding.UTF8.GetBytes(report.CsvContent),
            "text/csv",
            report.FileName);
    }
}
