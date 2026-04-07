using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Contracts.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/contracts")]
public sealed class ContractsController : ApiControllerBase
{
    private readonly IContractsService _contractsService;

    public ContractsController(IContractsService contractsService)
    {
        _contractsService = contractsService;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<ActionResult<IReadOnlyList<ContractListItemDto>>> List(
        [FromQuery] string? search,
        [FromQuery] ContractStatus? status,
        [FromQuery] Guid? lotId,
        [FromQuery] Guid? procedureId,
        [FromQuery] Guid? contractorId,
        CancellationToken cancellationToken)
    {
        var result = await _contractsService.ListAsync(search, status, lotId, procedureId, contractorId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<ActionResult<ContractDetailsDto>> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _contractsService.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.ContractsCreate)]
    public async Task<ActionResult<ContractDetailsDto>> Create(
        [FromBody] CreateContractRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _contractsService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ContractsUpdate)]
    public async Task<ActionResult<ContractDetailsDto>> Update(
        [FromRoute] Guid id,
        [FromBody] UpdateContractRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _contractsService.UpdateAsync(id, request, cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
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

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ContractsDelete)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _contractsService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/transition")]
    [Authorize(Policy = PolicyCodes.ContractsUpdate)]
    public async Task<ActionResult<ContractStatusHistoryItemDto>> Transition(
        [FromRoute] Guid id,
        [FromBody] ContractStatusTransitionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.TransitionAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
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
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<ActionResult<IReadOnlyList<ContractStatusHistoryItemDto>>> History(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _contractsService.GetHistoryAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}/execution")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<ActionResult<ContractExecutionSummaryDto>> ExecutionSummary(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.GetExecutionSummaryAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{id:guid}/milestones")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<ActionResult<IReadOnlyList<ContractMilestoneDto>>> GetMilestones(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.GetMilestonesAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/milestones")]
    [Authorize(Policy = PolicyCodes.ContractsUpdate)]
    public async Task<ActionResult<IReadOnlyList<ContractMilestoneDto>>> UpsertMilestones(
        [FromRoute] Guid id,
        [FromBody] UpdateContractMilestonesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.UpsertMilestonesAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpGet("{id:guid}/monitoring/control-points")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<ActionResult<IReadOnlyList<ContractMonitoringControlPointDto>>> GetMonitoringControlPoints(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.GetMonitoringControlPointsAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/monitoring/control-points")]
    [Authorize(Policy = PolicyCodes.ContractsUpdate)]
    public async Task<ActionResult<IReadOnlyList<ContractMonitoringControlPointDto>>> UpsertMonitoringControlPoints(
        [FromRoute] Guid id,
        [FromBody] UpdateContractMonitoringControlPointsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.UpsertMonitoringControlPointsAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpGet("{id:guid}/monitoring/mdr-cards")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<ActionResult<IReadOnlyList<ContractMdrCardDto>>> GetMdrCards(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.GetMdrCardsAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("{id:guid}/monitoring/mdr-cards")]
    [Authorize(Policy = PolicyCodes.ContractsUpdate)]
    public async Task<ActionResult<IReadOnlyList<ContractMdrCardDto>>> UpsertMdrCards(
        [FromRoute] Guid id,
        [FromBody] UpdateContractMdrCardsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.UpsertMdrCardsAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpPost("{id:guid}/monitoring/mdr-cards/import-forecast-fact")]
    [Authorize(Policy = PolicyCodes.ContractsUpdate)]
    public async Task<ActionResult<ImportContractMdrForecastFactResultDto>> ImportMdrForecastFact(
        [FromRoute] Guid id,
        [FromBody] ImportContractMdrForecastFactRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _contractsService.ImportMdrForecastFactAsync(id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
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

    [HttpGet("monitoring/templates/control-points")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public IActionResult DownloadControlPointsTemplate()
    {
        const string content =
            "ControlPointName,ResponsibleRole,PlannedDate,ForecastDate,ActualDate,ProgressPercent,SortOrder,Notes,StageName,StagePlannedDate,StageForecastDate,StageActualDate,StageProgressPercent,StageSortOrder,StageNotes\n" +
            "Контрольная точка 1,ГИП,2026-04-10,2026-04-12,,45,0,Проверка готовности,Этап 1,2026-04-10,2026-04-11,,70,0,Черновой контроль\n" +
            "Контрольная точка 1,ГИП,2026-04-10,2026-04-12,,45,0,Проверка готовности,Этап 2,2026-04-15,,,20,1,\n";

        return File(
            Encoding.UTF8.GetBytes(content),
            "text/csv",
            "contract-monitoring-control-points-template.csv");
    }

    [HttpGet("monitoring/templates/mdr-cards")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public IActionResult DownloadMdrCardsTemplate()
    {
        const string content =
            "CardTitle,ReportingDate,SortOrder,CardNotes,RowCode,Description,UnitCode,PlanValue,ForecastValue,FactValue,RowSortOrder,RowNotes\n" +
            "MDR Апрель,2026-04-30,0,Ежемесячный срез,ROW-001,Разработка РД,чел.ч,120,130,112,0,\n" +
            "MDR Апрель,2026-04-30,0,Ежемесячный срез,ROW-002,Авторский надзор,чел.ч,80,90,76,1,Смещение графика\n";

        return File(
            Encoding.UTF8.GetBytes(content),
            "text/csv",
            "contract-monitoring-mdr-template.csv");
    }

    [HttpPost("procedures/{procedureId:guid}/draft")]
    [Authorize(Policy = PolicyCodes.ContractsCreate)]
    public async Task<ActionResult<ContractDetailsDto>> CreateDraftFromProcedure(
        [FromRoute] Guid procedureId,
        [FromBody] CreateContractDraftFromProcedureRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _contractsService.CreateDraftFromProcedureAsync(procedureId, request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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
}
