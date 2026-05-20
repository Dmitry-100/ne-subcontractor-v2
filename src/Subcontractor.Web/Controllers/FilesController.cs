using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Files;
using Subcontractor.Application.Files.Models;
using Subcontractor.Web.Authorization;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/files")]
public sealed class FilesController : ApiControllerBase
{
    private const long MaxUploadSizeBytes = 25 * 1024 * 1024;

    private readonly IStoredFilesService _storedFilesService;

    public FilesController(IStoredFilesService storedFilesService)
    {
        _storedFilesService = storedFilesService;
    }

    [HttpPost]
    [Authorize(Policy = PolicyCodes.ProceduresCreate)]
    [RequestSizeLimit(MaxUploadSizeBytes)]
    public async Task<ActionResult<StoredFileDto>> Upload(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("Файл обязателен.");
        }

        if (file.Length > MaxUploadSizeBytes)
        {
            return BadRequestProblem("Размер файла не должен превышать 25 МБ.");
        }

        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory, cancellationToken);

        try
        {
            var created = await _storedFilesService.CreateUnassignedAsync(
                file.FileName,
                file.ContentType,
                memory.ToArray(),
                cancellationToken);
            return CreatedAtAction(nameof(Upload), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }
}
