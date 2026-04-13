using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Domain.Sla;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Sla;

public sealed class SlaMonitoringServiceTests
{
    [Fact]
    public async Task RunMonitoringCycleAsync_ShouldCreateViolationsAndSendNotifications()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var emailSender = new FakeNotificationEmailSender();
        var service = CreateService(db, now, emailSender);

        var responsibleUser = new AppUser
        {
            Login = "responsible.user",
            DisplayName = "Responsible User",
            Email = "responsible.user@noreply.local"
        };
        await db.Set<AppUser>().AddAsync(responsibleUser);

        var procedureWarning = new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            ObjectName = "Процедура предупреждение",
            PurchaseTypeCode = "OPEN",
            Status = ProcurementProcedureStatus.OnApproval,
            ResponsibleCommercialUserId = responsibleUser.Id,
            ProposalDueDate = now.UtcDateTime.Date.AddDays(1)
        };
        var procedureOverdue = new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            ObjectName = "Процедура просрочка",
            PurchaseTypeCode = "OPEN",
            Status = ProcurementProcedureStatus.Sent,
            ResponsibleCommercialUserId = responsibleUser.Id,
            RequiredSubcontractorDeadline = now.UtcDateTime.Date.AddDays(-1)
        };
        await db.Set<ProcurementProcedure>().AddRangeAsync(procedureWarning, procedureOverdue);

        var contract = new Contract
        {
            LotId = Guid.NewGuid(),
            ProcedureId = procedureWarning.Id,
            ContractorId = Guid.NewGuid(),
            ContractNumber = "CTR-001",
            Status = ContractStatus.Active,
            EndDate = now.UtcDateTime.Date.AddDays(1)
        };
        await db.Set<Contract>().AddAsync(contract);

        var milestone = new ContractMilestone
        {
            ContractId = contract.Id,
            Title = "Milestone overdue",
            PlannedDate = now.UtcDateTime.Date.AddDays(-2),
            ProgressPercent = 20m,
            SortOrder = 0
        };
        await db.Set<ContractMilestone>().AddAsync(milestone);

        await db.Set<SlaRule>().AddAsync(new SlaRule
        {
            PurchaseTypeCode = "OPEN",
            WarningDaysBeforeDue = 2,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var firstRun = await service.RunMonitoringCycleAsync(sendNotifications: true);
        Assert.Equal(4, firstRun.ActiveViolations);
        Assert.Equal(4, firstRun.OpenViolations);
        Assert.Equal(4, firstRun.NotificationSuccessCount);
        Assert.Equal(0, firstRun.NotificationFailureCount);
        Assert.Equal(4, emailSender.Messages.Count);

        var violations = db.Set<SlaViolation>().ToArray();
        Assert.Equal(4, violations.Length);
        Assert.Contains(violations, x => x.Severity == SlaViolationSeverity.Warning);
        Assert.Contains(violations, x => x.Severity == SlaViolationSeverity.Overdue);
        Assert.All(violations, x => Assert.False(x.IsResolved));
        Assert.All(violations, x => Assert.NotNull(x.LastNotificationSentAtUtc));

        var secondRun = await service.RunMonitoringCycleAsync(sendNotifications: true);
        Assert.Equal(4, secondRun.ActiveViolations);
        Assert.Equal(4, secondRun.OpenViolations);
        Assert.Equal(0, secondRun.NotificationSuccessCount);
        Assert.Equal(0, secondRun.NotificationFailureCount);
        Assert.Equal(4, emailSender.Messages.Count);
    }

    [Fact]
    public async Task SetViolationReasonAsync_KnownReferenceReason_ShouldPersistCode()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var service = CreateService(db, now, new FakeNotificationEmailSender());

        await db.Set<ReferenceDataEntry>().AddAsync(new ReferenceDataEntry
        {
            TypeCode = SlaReasonCodes.ReferenceDataTypeCode,
            ItemCode = "DOC_DELAY",
            DisplayName = "Задержка документов",
            SortOrder = 10,
            IsActive = true
        });

        var violation = new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractEndDate,
            EntityId = Guid.NewGuid(),
            DueDate = now.UtcDateTime.Date,
            Severity = SlaViolationSeverity.Overdue,
            Title = "Просроченный договор",
            RecipientEmail = "responsible.user@noreply.local",
            FirstDetectedAtUtc = now.UtcDateTime,
            LastDetectedAtUtc = now.UtcDateTime
        };
        await db.Set<SlaViolation>().AddAsync(violation);
        await db.SaveChangesAsync();

        var updated = await service.SetViolationReasonAsync(violation.Id, new UpdateSlaViolationReasonRequest
        {
            ReasonCode = "doc_delay",
            ReasonComment = "Ожидание подписанного приложения."
        });

        Assert.NotNull(updated);
        Assert.Equal("DOC_DELAY", updated!.ReasonCode);
        Assert.Equal("Ожидание подписанного приложения.", updated.ReasonComment);
        Assert.NotNull(updated.ReasonAssignedAtUtc);
    }

    private static SlaMonitoringService CreateService(
        Infrastructure.Persistence.AppDbContext db,
        DateTimeOffset now,
        FakeNotificationEmailSender emailSender)
    {
        var options = Options.Create(new SlaMonitoringOptions
        {
            DefaultWarningDaysBeforeDue = 2
        });
        var candidateQueryService = new SlaViolationCandidateQueryService(db, options);
        return new SlaMonitoringService(
            db,
            new FixedDateTimeProvider(now),
            emailSender,
            candidateQueryService,
            options);
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
