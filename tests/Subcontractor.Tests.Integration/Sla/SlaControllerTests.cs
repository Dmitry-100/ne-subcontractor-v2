using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.Sla;
using Subcontractor.Tests.Integration.TestInfrastructure;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Sla;

public sealed class SlaControllerTests
{
    [Fact]
    public async Task ListViolations_ShouldReturnOkPayload()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        await db.Set<SlaViolation>().AddAsync(new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractEndDate,
            EntityId = Guid.NewGuid(),
            DueDate = now.UtcDateTime.Date,
            Severity = SlaViolationSeverity.Warning,
            Title = "Contract warning",
            FirstDetectedAtUtc = now.UtcDateTime,
            LastDetectedAtUtc = now.UtcDateTime
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db, now);
        var result = await controller.ListViolations(false, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IReadOnlyList<SlaViolationDto>>(ok.Value);
        Assert.Single(payload);
    }

    [Fact]
    public async Task SetReason_UnknownViolation_ShouldReturnNotFound()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db, now);

        var result = await controller.SetReason(
            Guid.NewGuid(),
            new UpdateSlaViolationReasonRequest
            {
                ReasonCode = "DOC_DELAY"
            },
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task SetReason_UnknownReasonCode_ShouldReturnBadRequestProblem()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var violation = new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractEndDate,
            EntityId = Guid.NewGuid(),
            DueDate = now.UtcDateTime.Date,
            Severity = SlaViolationSeverity.Overdue,
            Title = "Contract overdue",
            FirstDetectedAtUtc = now.UtcDateTime,
            LastDetectedAtUtc = now.UtcDateTime
        };
        await db.Set<SlaViolation>().AddAsync(violation);
        await db.SaveChangesAsync();

        var controller = CreateController(db, now);
        var result = await controller.SetReason(
            violation.Id,
            new UpdateSlaViolationReasonRequest
            {
                ReasonCode = "UNKNOWN_REASON"
            },
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Contains("not found", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RunMonitoringCycle_EmptyData_ShouldReturnOkWithZeroCounters()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var controller = CreateController(db, now);

        var result = await controller.RunMonitoringCycle(sendNotifications: true, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<SlaMonitoringRunResultDto>(ok.Value);
        Assert.Equal(0, payload.ActiveViolations);
        Assert.Equal(0, payload.OpenViolations);
    }

    private static SlaController CreateController(Infrastructure.Persistence.AppDbContext db, DateTimeOffset now)
    {
        var options = Options.Create(new SlaMonitoringOptions());
        var candidateQueryService = new SlaViolationCandidateQueryService(db, options);
        var service = new SlaMonitoringService(
            db,
            new FixedDateTimeProvider(now),
            new FakeNotificationEmailSender(),
            candidateQueryService,
            options);
        return new SlaController(service);
    }

    private sealed class FakeNotificationEmailSender : INotificationEmailSender
    {
        public Task<NotificationEmailSendResult> SendAsync(
            NotificationEmailMessage message,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new NotificationEmailSendResult(true, null));
        }
    }

    private sealed class FixedDateTimeProvider : IDateTimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FixedDateTimeProvider(DateTimeOffset utcNow)
        {
            _utcNow = utcNow;
        }

        public DateTimeOffset UtcNow => _utcNow;
    }
}
