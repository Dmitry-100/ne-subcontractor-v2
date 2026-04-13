using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Services;

namespace Subcontractor.Web.Controllers;

[ApiController]
[Route("api/demo")]
public sealed class DemoController : ApiControllerBase
{
    private readonly IDemoContractsSmokeSeedService _seedService;
    private readonly IOptions<DemoSeedOptions> _options;

    public DemoController(
        IDemoContractsSmokeSeedService seedService,
        IOptions<DemoSeedOptions> options)
    {
        _seedService = seedService;
        _options = options;
    }

    [HttpPost("contracts/smoke-seed")]
    [Authorize]
    public async Task<ActionResult<DemoContractsSmokeSeedResult>> SeedContractsSmokeData(CancellationToken cancellationToken)
    {
        if (!_options.Value.EnableApi)
        {
            return NotFoundProblem("Demo seed API отключен в конфигурации.");
        }

        try
        {
            var result = await _seedService.EnsureContractsSmokeSeedAsync(cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return ConflictProblem(ex.Message, "Не удалось подготовить демо-данные.");
        }
        catch (ArgumentException ex)
        {
            return BadRequestProblem(ex.Message, "Некорректные параметры демо-сидинга.");
        }
    }
}
