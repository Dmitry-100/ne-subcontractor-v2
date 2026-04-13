using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Controllers;
using Subcontractor.Web.Services;

namespace Subcontractor.Tests.Integration.Demo;

public sealed class DemoControllerBranchCoverageTests
{
    [Fact]
    public async Task SeedContractsSmokeData_WhenApiDisabled_ShouldReturnNotFoundProblem()
    {
        var controller = CreateController(
            new StubDemoContractsSmokeSeedService(),
            new DemoSeedOptions { EnableApi = false, EnableStartupSeed = false, ContractsPrefix = "SMOKE" });

        var result = await controller.SeedContractsSmokeData(CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task SeedContractsSmokeData_WhenApiEnabledAndSuccessful_ShouldReturnOk()
    {
        var expected = new DemoContractsSmokeSeedResult(
            Created: true,
            ContractsWithPrefix: 1,
            ContractNumberPrefix: "SMOKE",
            CreatedContractNumber: "SMOKE-001");
        var seedService = new StubDemoContractsSmokeSeedService
        {
            EnsureContractsSmokeSeedAsyncHandler = _ => Task.FromResult(expected)
        };
        var controller = CreateController(
            seedService,
            new DemoSeedOptions { EnableApi = true, EnableStartupSeed = false, ContractsPrefix = "SMOKE" });

        var result = await controller.SeedContractsSmokeData(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<DemoContractsSmokeSeedResult>(ok.Value);
        Assert.Equal(expected.ContractNumberPrefix, payload.ContractNumberPrefix);
    }

    [Fact]
    public async Task SeedContractsSmokeData_WhenServiceThrowsInvalidOperation_ShouldReturnConflictProblem()
    {
        var seedService = new StubDemoContractsSmokeSeedService
        {
            EnsureContractsSmokeSeedAsyncHandler = _ => throw new InvalidOperationException("Seed conflict.")
        };
        var controller = CreateController(
            seedService,
            new DemoSeedOptions { EnableApi = true, EnableStartupSeed = false, ContractsPrefix = "SMOKE" });

        var result = await controller.SeedContractsSmokeData(CancellationToken.None);

        var conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task SeedContractsSmokeData_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var seedService = new StubDemoContractsSmokeSeedService
        {
            EnsureContractsSmokeSeedAsyncHandler = _ => throw new ArgumentException("Invalid seed options.")
        };
        var controller = CreateController(
            seedService,
            new DemoSeedOptions { EnableApi = true, EnableStartupSeed = false, ContractsPrefix = "SMOKE" });

        var result = await controller.SeedContractsSmokeData(CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    private static DemoController CreateController(
        IDemoContractsSmokeSeedService seedService,
        DemoSeedOptions options)
    {
        return new DemoController(seedService, Options.Create(options))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
    }

    private sealed class StubDemoContractsSmokeSeedService : IDemoContractsSmokeSeedService
    {
        public Func<CancellationToken, Task<DemoContractsSmokeSeedResult>> EnsureContractsSmokeSeedAsyncHandler { get; set; } =
            static _ => Task.FromResult(
                new DemoContractsSmokeSeedResult(
                    Created: false,
                    ContractsWithPrefix: 0,
                    ContractNumberPrefix: "SMOKE",
                    CreatedContractNumber: null));

        public Task<DemoContractsSmokeSeedResult> EnsureContractsSmokeSeedAsync(CancellationToken cancellationToken = default)
            => EnsureContractsSmokeSeedAsyncHandler(cancellationToken);
    }
}
