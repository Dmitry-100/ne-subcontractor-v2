using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Imports;
using Subcontractor.Application.Imports.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/imports/source-data/xml/inbox")]
public sealed class SourceDataXmlImportsController : ApiControllerBase
{
    private readonly IXmlSourceDataImportInboxService _xmlInboxService;

    public SourceDataXmlImportsController(IXmlSourceDataImportInboxService xmlInboxService)
    {
        _xmlInboxService = xmlInboxService;
    }

    [HttpGet]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<ActionResult<IReadOnlyList<XmlSourceDataImportInboxItemDto>>> List(CancellationToken cancellationToken)
    {
        var result = await _xmlInboxService.ListAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PolicyCodes.ImportsRead)]
    public async Task<ActionResult<XmlSourceDataImportInboxItemDto>> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _xmlInboxService.GetByIdAsync(id, cancellationToken);
        return result is null
            ? NotFoundProblem($"Элемент XML-импорта '{id}' не найден.")
            : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.ImportsWrite)]
    public async Task<ActionResult<XmlSourceDataImportInboxItemDto>> Create(
        [FromBody] CreateXmlSourceDataImportInboxItemRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _xmlInboxService.QueueAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpPost("{id:guid}/retry")]
    [Authorize(Policy = PolicyCodes.ImportsWrite)]
    public async Task<ActionResult<XmlSourceDataImportInboxItemDto>> Retry([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _xmlInboxService.RetryAsync(id, cancellationToken);
            return result is null
                ? NotFoundProblem($"Элемент XML-импорта '{id}' не найден.")
                : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message);
        }
    }
}
