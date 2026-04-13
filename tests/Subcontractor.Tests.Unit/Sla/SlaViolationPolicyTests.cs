using Subcontractor.Application.Sla;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Tests.Unit.Sla;

public sealed class SlaViolationPolicyTests
{
    [Fact]
    public void ResolveSeverity_WhenDueDateInPast_ShouldReturnOverdue()
    {
        var severity = SlaViolationPolicy.ResolveSeverity(
            dueDate: new DateTime(2026, 4, 9),
            warningDays: 3,
            utcToday: new DateTime(2026, 4, 10));

        Assert.Equal(SlaViolationSeverity.Overdue, severity);
    }

    [Fact]
    public void ResolveSeverity_WhenDueDateWithinWarningWindow_ShouldReturnWarning()
    {
        var severity = SlaViolationPolicy.ResolveSeverity(
            dueDate: new DateTime(2026, 4, 12),
            warningDays: 2,
            utcToday: new DateTime(2026, 4, 10));

        Assert.Equal(SlaViolationSeverity.Warning, severity);
    }

    [Fact]
    public void ResolveSeverity_WhenDueDateAfterWindow_ShouldReturnNull()
    {
        var severity = SlaViolationPolicy.ResolveSeverity(
            dueDate: new DateTime(2026, 4, 20),
            warningDays: 2,
            utcToday: new DateTime(2026, 4, 10));

        Assert.Null(severity);
    }

    [Fact]
    public void BuildViolationKey_ShouldProduceDeterministicFormat()
    {
        var entityId = Guid.Parse("11111111-2222-3333-4444-555555555555");

        var key = SlaViolationPolicy.BuildViolationKey(
            SlaViolationEntityType.ContractMilestone,
            entityId,
            new DateTime(2026, 4, 10),
            SlaViolationSeverity.Warning);

        Assert.Equal("ContractMilestone|11111111222233334444555555555555|20260410|Warning", key);
    }
}
