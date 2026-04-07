using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Exports;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/exports")]
public sealed class ExportsController : ControllerBase
{
    private readonly IRegistryExportService _registryExportService;

    public ExportsController(IRegistryExportService registryExportService)
    {
        _registryExportService = registryExportService;
    }

    [HttpGet("projects")]
    [Authorize(Policy = PolicyCodes.ProjectsRead)]
    public async Task<IActionResult> ExportProjects(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _registryExportService.ExportProjectsAsync(search, cancellationToken);
        return File(result.Content, result.ContentType, result.FileName);
    }

    [HttpGet("contractors")]
    [Authorize(Policy = PolicyCodes.ContractorsRead)]
    public async Task<IActionResult> ExportContractors(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await _registryExportService.ExportContractorsAsync(search, cancellationToken);
        return File(result.Content, result.ContentType, result.FileName);
    }

    [HttpGet("lots")]
    [Authorize(Policy = PolicyCodes.LotsRead)]
    public async Task<IActionResult> ExportLots(
        [FromQuery] string? search,
        [FromQuery] LotStatus? status,
        [FromQuery] Guid? projectId,
        CancellationToken cancellationToken)
    {
        var result = await _registryExportService.ExportLotsAsync(search, status, projectId, cancellationToken);
        return File(result.Content, result.ContentType, result.FileName);
    }

    [HttpGet("procedures")]
    [Authorize(Policy = PolicyCodes.ProceduresRead)]
    public async Task<IActionResult> ExportProcedures(
        [FromQuery] string? search,
        [FromQuery] ProcurementProcedureStatus? status,
        [FromQuery] Guid? lotId,
        CancellationToken cancellationToken)
    {
        var result = await _registryExportService.ExportProceduresAsync(search, status, lotId, cancellationToken);
        return File(result.Content, result.ContentType, result.FileName);
    }

    [HttpGet("contracts")]
    [Authorize(Policy = PolicyCodes.ContractsRead)]
    public async Task<IActionResult> ExportContracts(
        [FromQuery] string? search,
        [FromQuery] ContractStatus? status,
        [FromQuery] Guid? lotId,
        [FromQuery] Guid? procedureId,
        [FromQuery] Guid? contractorId,
        CancellationToken cancellationToken)
    {
        var result = await _registryExportService.ExportContractsAsync(
            search,
            status,
            lotId,
            procedureId,
            contractorId,
            cancellationToken);
        return File(result.Content, result.ContentType, result.FileName);
    }
}
