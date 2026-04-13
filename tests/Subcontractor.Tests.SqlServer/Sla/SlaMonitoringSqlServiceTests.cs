using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Domain.Sla;
using Subcontractor.Domain.Users;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Sla;

[Trait("SqlSuite", "Core")]
public sealed class SlaMonitoringSqlServiceTests
{
    [SqlFact]
    public async Task RunMonitoringCycleAsync_ShouldCreateViolationsAndSendNotifications()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
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
        Assert.All(violations, x => Assert.False(x.IsResolved));
    }

    [SqlFact]
    public async Task RunMonitoringCycleAsync_RepeatedRun_ShouldAvoidDuplicateNotifications_AndResolveWhenConditionIsGone()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var emailSender = new FakeNotificationEmailSender();
        var service = CreateService(db, now, emailSender);

        var responsibleUser = new AppUser
        {
            Login = "responsible.user",
            DisplayName = "Responsible User",
            Email = "responsible.user@noreply.local"
        };
        await db.Set<AppUser>().AddAsync(responsibleUser);

        var procedure = new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            ObjectName = "Процедура контроль повторного уведомления",
            PurchaseTypeCode = "OPEN",
            Status = ProcurementProcedureStatus.OnApproval,
            ResponsibleCommercialUserId = responsibleUser.Id,
            ProposalDueDate = now.UtcDateTime.Date.AddDays(1)
        };
        await db.Set<ProcurementProcedure>().AddAsync(procedure);

        await db.Set<SlaRule>().AddAsync(new SlaRule
        {
            PurchaseTypeCode = "OPEN",
            WarningDaysBeforeDue = 2,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var firstRun = await service.RunMonitoringCycleAsync(sendNotifications: true);
        Assert.Equal(1, firstRun.ActiveViolations);
        Assert.Equal(1, firstRun.OpenViolations);
        Assert.Equal(1, firstRun.NotificationSuccessCount);
        Assert.Equal(0, firstRun.NotificationFailureCount);
        Assert.Single(emailSender.Messages);

        var secondRun = await service.RunMonitoringCycleAsync(sendNotifications: true);
        Assert.Equal(1, secondRun.ActiveViolations);
        Assert.Equal(1, secondRun.OpenViolations);
        Assert.Equal(0, secondRun.ResolvedViolations);
        Assert.Equal(0, secondRun.NotificationSuccessCount);
        Assert.Equal(0, secondRun.NotificationFailureCount);
        Assert.Single(emailSender.Messages);

        procedure.ProposalDueDate = now.UtcDateTime.Date.AddDays(30);
        await db.SaveChangesAsync();

        var thirdRun = await service.RunMonitoringCycleAsync(sendNotifications: true);
        Assert.Equal(0, thirdRun.ActiveViolations);
        Assert.Equal(0, thirdRun.OpenViolations);
        Assert.Equal(1, thirdRun.ResolvedViolations);
        Assert.Equal(0, thirdRun.NotificationSuccessCount);
        Assert.Equal(0, thirdRun.NotificationFailureCount);
        Assert.Single(emailSender.Messages);

        var violation = db.Set<SlaViolation>().Single();
        Assert.True(violation.IsResolved);
        Assert.NotNull(violation.ResolvedAtUtc);
        Assert.Equal(1, violation.NotificationAttempts);
        Assert.NotNull(violation.LastNotificationSentAtUtc);
    }

    [SqlFact]
    public async Task RunMonitoringCycleAsync_WithSendNotificationsFalse_ShouldSkipNotificationAttempt()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var emailSender = new FakeNotificationEmailSender();
        var service = CreateService(db, now, emailSender);

        var responsibleUser = new AppUser
        {
            Login = "sla.user",
            DisplayName = "Sla User",
            Email = "sla.user@noreply.local"
        };
        await db.Set<AppUser>().AddAsync(responsibleUser);

        var procedure = new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            ObjectName = "Процедура без уведомлений",
            PurchaseTypeCode = "OPEN",
            Status = ProcurementProcedureStatus.OnApproval,
            ResponsibleCommercialUserId = responsibleUser.Id,
            ProposalDueDate = now.UtcDateTime.Date.AddDays(1)
        };
        await db.Set<ProcurementProcedure>().AddAsync(procedure);

        await db.Set<SlaRule>().AddAsync(new SlaRule
        {
            PurchaseTypeCode = "OPEN",
            WarningDaysBeforeDue = 2,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var result = await service.RunMonitoringCycleAsync(sendNotifications: false);

        Assert.Equal(1, result.ActiveViolations);
        Assert.Equal(1, result.OpenViolations);
        Assert.Equal(0, result.NotificationSuccessCount);
        Assert.Equal(0, result.NotificationFailureCount);
        Assert.Empty(emailSender.Messages);

        var violation = await db.Set<SlaViolation>().SingleAsync();
        Assert.Equal(0, violation.NotificationAttempts);
        Assert.Null(violation.LastNotificationAttemptAtUtc);
        Assert.Null(violation.LastNotificationSentAtUtc);
        Assert.Null(violation.LastNotificationError);
    }

    [SqlFact]
    public async Task RunMonitoringCycleAsync_WhenRecipientEmailMissing_ShouldCountFailure_AndRetryOnNextRun()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var emailSender = new FakeNotificationEmailSender();
        var service = CreateService(db, now, emailSender);

        var responsibleUser = new AppUser
        {
            Login = "responsible.without.email",
            DisplayName = "Responsible Without Email",
            Email = "   "
        };
        await db.Set<AppUser>().AddAsync(responsibleUser);

        var procedure = new ProcurementProcedure
        {
            LotId = Guid.NewGuid(),
            ObjectName = "Процедура без email получателя",
            PurchaseTypeCode = "OPEN",
            Status = ProcurementProcedureStatus.OnApproval,
            ResponsibleCommercialUserId = responsibleUser.Id,
            ProposalDueDate = now.UtcDateTime.Date.AddDays(1)
        };
        await db.Set<ProcurementProcedure>().AddAsync(procedure);

        await db.Set<SlaRule>().AddAsync(new SlaRule
        {
            PurchaseTypeCode = "OPEN",
            WarningDaysBeforeDue = 2,
            IsActive = true
        });
        await db.SaveChangesAsync();

        var firstRun = await service.RunMonitoringCycleAsync(sendNotifications: true);
        Assert.Equal(1, firstRun.ActiveViolations);
        Assert.Equal(0, firstRun.NotificationSuccessCount);
        Assert.Equal(1, firstRun.NotificationFailureCount);
        Assert.Empty(emailSender.Messages);

        var afterFirstRun = await db.Set<SlaViolation>().SingleAsync();
        Assert.Equal(1, afterFirstRun.NotificationAttempts);
        Assert.NotNull(afterFirstRun.LastNotificationAttemptAtUtc);
        Assert.Null(afterFirstRun.LastNotificationSentAtUtc);
        Assert.Equal("Recipient email is not specified.", afterFirstRun.LastNotificationError);

        var secondRun = await service.RunMonitoringCycleAsync(sendNotifications: true);
        Assert.Equal(1, secondRun.ActiveViolations);
        Assert.Equal(0, secondRun.NotificationSuccessCount);
        Assert.Equal(1, secondRun.NotificationFailureCount);
        Assert.Empty(emailSender.Messages);

        var afterSecondRun = await db.Set<SlaViolation>().SingleAsync();
        Assert.Equal(2, afterSecondRun.NotificationAttempts);
        Assert.NotNull(afterSecondRun.LastNotificationAttemptAtUtc);
        Assert.Null(afterSecondRun.LastNotificationSentAtUtc);
        Assert.Equal("Recipient email is not specified.", afterSecondRun.LastNotificationError);
    }

    [SqlFact]
    public async Task SetViolationReasonAsync_KnownReferenceReason_ShouldPersistCode()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
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

    [SqlFact]
    public async Task SetViolationReasonAsync_UnknownReasonCode_ShouldThrow_AndKeepViolationUnchanged()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync();
        await using var db = database.CreateDbContext();
        var service = CreateService(db, now, new FakeNotificationEmailSender());

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

        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.SetViolationReasonAsync(
            violation.Id,
            new UpdateSlaViolationReasonRequest
            {
                ReasonCode = "UNKNOWN_REASON",
                ReasonComment = "comment"
            }));

        Assert.Contains(
            $"Reason code 'UNKNOWN_REASON' is not found in reference data '{SlaReasonCodes.ReferenceDataTypeCode}'.",
            error.Message,
            StringComparison.Ordinal);
        Assert.Equal("ReasonCode", error.ParamName);

        var reloaded = await db.Set<SlaViolation>()
            .AsNoTracking()
            .SingleAsync(x => x.Id == violation.Id);

        Assert.Null(reloaded.ReasonCode);
        Assert.Null(reloaded.ReasonComment);
        Assert.Null(reloaded.ReasonAssignedAtUtc);
    }

    private static SlaMonitoringService CreateService(
        Subcontractor.Infrastructure.Persistence.AppDbContext db,
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
