using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contracts;
using Subcontractor.Application.Lots;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Configuration;
using Subcontractor.Web.Controllers;
using Subcontractor.Web.Services;

namespace Subcontractor.Tests.Integration.Demo;

public sealed class DemoContractsSmokeSeedControllerTests
{
    [Fact]
    public async Task SeedContractsSmokeData_WhenApiDisabled_ShouldReturnNotFoundProblem()
    {
        await using var db = TestDbContextFactory.Create("demo-seed-user");
        var controller = CreateController(db, new DemoSeedOptions
        {
            EnableApi = false,
            EnableStartupSeed = false,
            ContractsPrefix = "SMOKE-READONLY"
        });

        var result = await controller.SeedContractsSmokeData(CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
        Assert.Equal("Ресурс не найден.", problem.Title);
    }

    [Fact]
    public async Task SeedContractsSmokeData_WhenApiEnabled_ShouldSeedData_AndStayIdempotent()
    {
        await using var db = TestDbContextFactory.Create("demo-seed-user");
        const string prefix = "SMOKE-READONLY";
        var controller = CreateController(db, new DemoSeedOptions
        {
            EnableApi = true,
            EnableStartupSeed = false,
            ContractsPrefix = prefix
        });

        var first = await controller.SeedContractsSmokeData(CancellationToken.None);
        var firstOk = Assert.IsType<OkObjectResult>(first.Result);
        var firstPayload = Assert.IsType<DemoContractsSmokeSeedResult>(firstOk.Value);
        Assert.True(firstPayload.Created);
        Assert.Equal(prefix, firstPayload.ContractNumberPrefix);
        Assert.NotNull(firstPayload.CreatedContractNumber);

        var second = await controller.SeedContractsSmokeData(CancellationToken.None);
        var secondOk = Assert.IsType<OkObjectResult>(second.Result);
        var secondPayload = Assert.IsType<DemoContractsSmokeSeedResult>(secondOk.Value);
        Assert.False(secondPayload.Created);
        Assert.Equal(prefix, secondPayload.ContractNumberPrefix);

        var contractsService = new ContractsService(db);
        var contracts = await contractsService.ListAsync(
            search: prefix,
            status: null,
            lotId: null,
            procedureId: null,
            contractorId: null,
            cancellationToken: CancellationToken.None);

        Assert.Single(contracts);
        Assert.Contains(prefix, contracts[0].ContractNumber, StringComparison.Ordinal);
    }

    private static DemoController CreateController(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
        DemoSeedOptions options)
    {
        var currentUserService = new TestCurrentUserService("demo-seed-user");
        var projectsService = new ProjectsService(db, currentUserService);
        var lotsService = new LotsService(db);
        var contractorsService = new ContractorsService(db);
        var procurementService = new ProcurementProceduresService(db, currentUserService, contractorsService);
        var contractsService = new ContractsService(db);

        var seedService = new DemoContractsSmokeSeedService(
            projectsService,
            lotsService,
            procurementService,
            contractorsService,
            contractsService,
            Options.Create(options),
            NullLogger<DemoContractsSmokeSeedService>.Instance);

        var controller = new DemoController(seedService, Options.Create(options))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        controller.HttpContext.TraceIdentifier = "corr-demo-seed-tests";
        controller.HttpContext.Request.Path = "/api/demo/contracts/smoke-seed";
        return controller;
    }
}
