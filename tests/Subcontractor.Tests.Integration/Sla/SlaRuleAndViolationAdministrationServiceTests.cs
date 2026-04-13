using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Sla;
using Subcontractor.Application.Sla.Models;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Domain.Sla;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Sla;

public sealed class SlaRuleAndViolationAdministrationServiceTests
{
    [Fact]
    public async Task UpsertRulesAsync_ShouldNormalizeAndPersistRules()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var service = CreateService(db, now);

        var result = await service.UpsertRulesAsync(new UpdateSlaRulesRequest
        {
            Items =
            [
                new UpsertSlaRuleItemRequest
                {
                    PurchaseTypeCode = " open ",
                    WarningDaysBeforeDue = 4,
                    IsActive = true,
                    Description = "  Open procedure  "
                }
            ]
        });

        var rule = Assert.Single(result);
        Assert.Equal("OPEN", rule.PurchaseTypeCode);
        Assert.Equal(4, rule.WarningDaysBeforeDue);
        Assert.Equal("Open procedure", rule.Description);

        var loaded = await service.GetRulesAsync();
        var loadedRule = Assert.Single(loaded);
        Assert.Equal("OPEN", loadedRule.PurchaseTypeCode);
        Assert.Equal(4, loadedRule.WarningDaysBeforeDue);
    }

    [Fact]
    public async Task ListViolationsAsync_ShouldFilterResolvedByDefault()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var service = CreateService(db, now);

        await db.Set<SlaViolation>().AddRangeAsync(
            new SlaViolation
            {
                EntityType = SlaViolationEntityType.ProcedureProposalDueDate,
                EntityId = Guid.NewGuid(),
                DueDate = now.UtcDateTime.Date,
                Severity = SlaViolationSeverity.Warning,
                Title = "Open warning",
                IsResolved = false,
                FirstDetectedAtUtc = now.UtcDateTime,
                LastDetectedAtUtc = now.UtcDateTime
            },
            new SlaViolation
            {
                EntityType = SlaViolationEntityType.ContractEndDate,
                EntityId = Guid.NewGuid(),
                DueDate = now.UtcDateTime.Date.AddDays(-2),
                Severity = SlaViolationSeverity.Overdue,
                Title = "Resolved overdue",
                IsResolved = true,
                ResolvedAtUtc = now.UtcDateTime,
                FirstDetectedAtUtc = now.UtcDateTime.AddDays(-3),
                LastDetectedAtUtc = now.UtcDateTime.AddDays(-1)
            });
        await db.SaveChangesAsync();

        var openOnly = await service.ListViolationsAsync(includeResolved: false);
        Assert.Single(openOnly);
        Assert.False(openOnly[0].IsResolved);

        var all = await service.ListViolationsAsync(includeResolved: true);
        Assert.Equal(2, all.Count);
    }

    [Fact]
    public async Task SetViolationReasonAsync_KnownReason_ShouldAssignAndClearReason()
    {
        var now = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.Zero);
        await using var db = TestDbContextFactory.Create();
        var service = CreateService(db, now);

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
            FirstDetectedAtUtc = now.UtcDateTime,
            LastDetectedAtUtc = now.UtcDateTime
        };
        await db.Set<SlaViolation>().AddAsync(violation);
        await db.SaveChangesAsync();

        var assigned = await service.SetViolationReasonAsync(violation.Id, new UpdateSlaViolationReasonRequest
        {
            ReasonCode = "doc_delay",
            ReasonComment = "  Ожидание подписания  "
        });

        Assert.NotNull(assigned);
        Assert.Equal("DOC_DELAY", assigned!.ReasonCode);
        Assert.Equal("Ожидание подписания", assigned.ReasonComment);
        Assert.NotNull(assigned.ReasonAssignedAtUtc);

        var cleared = await service.SetViolationReasonAsync(violation.Id, new UpdateSlaViolationReasonRequest
        {
            ReasonCode = "   ",
            ReasonComment = "ignore"
        });

        Assert.NotNull(cleared);
        Assert.Null(cleared!.ReasonCode);
        Assert.Null(cleared.ReasonComment);
        Assert.Null(cleared.ReasonAssignedAtUtc);
    }

    private static SlaRuleAndViolationAdministrationService CreateService(
        Infrastructure.Persistence.AppDbContext db,
        DateTimeOffset now)
    {
        return new SlaRuleAndViolationAdministrationService(
            db,
            new FixedDateTimeProvider(now));
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
