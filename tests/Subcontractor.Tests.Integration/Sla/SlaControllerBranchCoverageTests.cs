using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Sla;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Sla;

public sealed class SlaControllerBranchCoverageTests
{
    [Fact]
    public async Task Endpoints_ShouldCoverSuccessBranches()
    {
        var service = new StubSlaMonitoringService();
        var controller = new SlaController(service);
        var violationId = Guid.NewGuid();

        var rules = await controller.GetRules(CancellationToken.None);
        var upsertRules = await controller.UpsertRules(new UpdateSlaRulesRequest(), CancellationToken.None);
        var violations = await controller.ListViolations(includeResolved: true, CancellationToken.None);
        var setReason = await controller.SetReason(
            violationId,
            new UpdateSlaViolationReasonRequest { ReasonCode = "DOC_DELAY" },
            CancellationToken.None);
        var run = await controller.RunMonitoringCycle(sendNotifications: false, CancellationToken.None);

        Assert.IsType<OkObjectResult>(rules.Result);
        Assert.IsType<OkObjectResult>(upsertRules.Result);
        Assert.IsType<OkObjectResult>(violations.Result);
        Assert.IsType<OkObjectResult>(setReason.Result);
        Assert.IsType<OkObjectResult>(run.Result);
        Assert.True(service.CapturedIncludeResolved);
        Assert.False(service.CapturedSendNotifications);
    }

    [Fact]
    public async Task UpsertRules_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubSlaMonitoringService
        {
            UpsertRulesAsyncHandler = (_, _) => throw new ArgumentException("Invalid SLA rules payload.")
        };
        var controller = new SlaController(service);

        var result = await controller.UpsertRules(new UpdateSlaRulesRequest(), CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    [Fact]
    public async Task SetReason_WhenViolationMissing_ShouldReturnNotFound()
    {
        var service = new StubSlaMonitoringService
        {
            SetViolationReasonAsyncHandler = (_, _, _) => Task.FromResult<SlaViolationDto?>(null)
        };
        var controller = new SlaController(service);

        var result = await controller.SetReason(
            Guid.NewGuid(),
            new UpdateSlaViolationReasonRequest { ReasonCode = "DOC_DELAY" },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task SetReason_WhenServiceThrowsArgumentException_ShouldReturnBadRequestProblem()
    {
        var service = new StubSlaMonitoringService
        {
            SetViolationReasonAsyncHandler = (_, _, _) => throw new ArgumentException("Unknown reason code.")
        };
        var controller = new SlaController(service);

        var result = await controller.SetReason(
            Guid.NewGuid(),
            new UpdateSlaViolationReasonRequest { ReasonCode = "UNKNOWN" },
            CancellationToken.None);

        var badRequest = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
    }

    private static SlaRuleDto CreateRule()
    {
        return new SlaRuleDto(
            Guid.NewGuid(),
            "OPEN",
            2,
            true,
            "Default SLA");
    }

    private static SlaViolationDto CreateViolation(Guid? id = null)
    {
        var now = DateTime.UtcNow;
        return new SlaViolationDto(
            id ?? Guid.NewGuid(),
            "ContractEndDate",
            Guid.NewGuid(),
            now.Date,
            "Warning",
            "Violation",
            null,
            false,
            now,
            now,
            null,
            0,
            null,
            null,
            null,
            "DOC_DELAY",
            null,
            null);
    }

    private static SlaMonitoringRunResultDto CreateRunResult()
    {
        var now = DateTimeOffset.UtcNow;
        return new SlaMonitoringRunResultDto(
            now.AddSeconds(-5),
            now,
            3,
            2,
            1,
            1,
            0);
    }

    private sealed class StubSlaMonitoringService : ISlaMonitoringService
    {
        public bool CapturedIncludeResolved { get; private set; }

        public bool CapturedSendNotifications { get; private set; }

        public Func<CancellationToken, Task<IReadOnlyList<SlaRuleDto>>> GetRulesAsyncHandler { get; set; } =
            static _ => Task.FromResult<IReadOnlyList<SlaRuleDto>>(new[] { CreateRule() });

        public Func<UpdateSlaRulesRequest, CancellationToken, Task<IReadOnlyList<SlaRuleDto>>> UpsertRulesAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<SlaRuleDto>>(new[] { CreateRule() });

        public Func<bool, CancellationToken, Task<IReadOnlyList<SlaViolationDto>>> ListViolationsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult<IReadOnlyList<SlaViolationDto>>(new[] { CreateViolation() });

        public Func<Guid, UpdateSlaViolationReasonRequest, CancellationToken, Task<SlaViolationDto?>> SetViolationReasonAsyncHandler { get; set; } =
            static (id, _, _) => Task.FromResult<SlaViolationDto?>(CreateViolation(id));

        public Func<bool, CancellationToken, Task<SlaMonitoringRunResultDto>> RunMonitoringCycleAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateRunResult());

        public Task<IReadOnlyList<SlaRuleDto>> GetRulesAsync(CancellationToken cancellationToken = default)
            => GetRulesAsyncHandler(cancellationToken);

        public Task<IReadOnlyList<SlaRuleDto>> UpsertRulesAsync(
            UpdateSlaRulesRequest request,
            CancellationToken cancellationToken = default)
            => UpsertRulesAsyncHandler(request, cancellationToken);

        public Task<IReadOnlyList<SlaViolationDto>> ListViolationsAsync(
            bool includeResolved = false,
            CancellationToken cancellationToken = default)
        {
            CapturedIncludeResolved = includeResolved;
            return ListViolationsAsyncHandler(includeResolved, cancellationToken);
        }

        public Task<SlaViolationDto?> SetViolationReasonAsync(
            Guid violationId,
            UpdateSlaViolationReasonRequest request,
            CancellationToken cancellationToken = default)
            => SetViolationReasonAsyncHandler(violationId, request, cancellationToken);

        public Task<SlaMonitoringRunResultDto> RunMonitoringCycleAsync(
            bool sendNotifications,
            CancellationToken cancellationToken = default)
        {
            CapturedSendNotifications = sendNotifications;
            return RunMonitoringCycleAsyncHandler(sendNotifications, cancellationToken);
        }
    }
}
