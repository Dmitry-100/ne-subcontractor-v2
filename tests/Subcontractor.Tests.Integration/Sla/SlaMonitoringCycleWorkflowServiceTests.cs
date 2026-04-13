using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Sla;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Sla;

public sealed class SlaMonitoringCycleWorkflowServiceTests
{
    [Fact]
    public async Task RunMonitoringCycleAsync_EmptyData_ShouldReturnZeroCounters()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var emailSender = new FakeNotificationEmailSender();
        var service = CreateService(db, now, emailSender);

        var result = await service.RunMonitoringCycleAsync(sendNotifications: true);

        Assert.Equal(0, result.ActiveViolations);
        Assert.Equal(0, result.OpenViolations);
        Assert.Equal(0, result.ResolvedViolations);
        Assert.Equal(0, result.NotificationSuccessCount);
        Assert.Equal(0, result.NotificationFailureCount);
        Assert.Empty(emailSender.Messages);
    }

    [Fact]
    public async Task RunMonitoringCycleAsync_SendNotificationsFalse_ShouldCreateViolationWithoutSending()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var emailSender = new FakeNotificationEmailSender();
        var service = CreateService(db, now, emailSender);

        var responsibleUser = new AppUser
        {
            Login = "sla.user",
            DisplayName = "SLA User",
            Email = "sla.user@noreply.local"
        };
        await db.Set<AppUser>().AddAsync(responsibleUser);

        await db.Set<SlaRule>().AddAsync(new SlaRule
        {
            PurchaseTypeCode = "OPEN",
            WarningDaysBeforeDue = 2,
            IsActive = true
        });

        await db.Set<ProcurementProcedure>().AddAsync(new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            ObjectName = "Процедура предупреждение",
            PurchaseTypeCode = "OPEN",
            Status = ProcurementProcedureStatus.OnApproval,
            ResponsibleCommercialUserId = responsibleUser.Id,
            ProposalDueDate = now.UtcDateTime.Date.AddDays(1)
        });

        await db.SaveChangesAsync();

        var result = await service.RunMonitoringCycleAsync(sendNotifications: false);

        Assert.Equal(1, result.ActiveViolations);
        Assert.Equal(1, result.OpenViolations);
        Assert.Equal(0, result.ResolvedViolations);
        Assert.Equal(0, result.NotificationSuccessCount);
        Assert.Equal(0, result.NotificationFailureCount);
        Assert.Empty(emailSender.Messages);

        var violation = Assert.Single(db.Set<SlaViolation>());
        Assert.False(violation.IsResolved);
        Assert.Null(violation.LastNotificationSentAtUtc);
        Assert.Equal(0, violation.NotificationAttempts);
    }

    private static SlaMonitoringCycleWorkflowService CreateService(
        Infrastructure.Persistence.AppDbContext db,
        DateTimeOffset now,
        FakeNotificationEmailSender emailSender)
    {
        var options = Options.Create(new SlaMonitoringOptions
        {
            DefaultWarningDaysBeforeDue = 2
        });
        var candidateQueryService = new SlaViolationCandidateQueryService(db, options);
        return new SlaMonitoringCycleWorkflowService(
            db,
            new FixedDateTimeProvider(now),
            emailSender,
            candidateQueryService);
    }

    private sealed class FakeNotificationEmailSender : INotificationEmailSender
    {
        public List<NotificationEmailMessage> Messages { get; } = [];

        public Task<NotificationEmailSendResult> SendAsync(
            NotificationEmailMessage message,
            CancellationToken cancellationToken = default)
        {
            Messages.Add(message);
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
