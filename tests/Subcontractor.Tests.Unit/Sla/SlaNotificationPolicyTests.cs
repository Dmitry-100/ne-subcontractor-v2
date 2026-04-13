using Subcontractor.Application.Sla;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Tests.Unit.Sla;

public sealed class SlaNotificationPolicyTests
{
    [Fact]
    public void BuildNotificationMessage_ShouldBuildLocalizedOverdueSubjectAndBody()
    {
        var candidate = new SlaActiveViolationCandidate(
            SlaViolationEntityType.ContractMilestone,
            Guid.NewGuid(),
            new DateTime(2026, 4, 10),
            SlaViolationSeverity.Overdue,
            "Этап договора CTR-001",
            "owner@noreply.local");

        var message = SlaNotificationPolicy.BuildNotificationMessage(candidate);

        Assert.Equal("owner@noreply.local", message.ToEmail);
        Assert.Equal("Просрочка SLA: Этап договора CTR-001", message.Subject);
        Assert.Contains("Событие SLA: Просрочка SLA", message.Body, StringComparison.Ordinal);
        Assert.Contains("Срок: 2026-04-10", message.Body, StringComparison.Ordinal);
        Assert.Contains("Тип: ContractMilestone", message.Body, StringComparison.Ordinal);
    }

    [Fact]
    public void BuildNotificationMessage_ShouldBuildLocalizedWarningSubject()
    {
        var candidate = new SlaActiveViolationCandidate(
            SlaViolationEntityType.ContractEndDate,
            Guid.NewGuid(),
            new DateTime(2026, 4, 15),
            SlaViolationSeverity.Warning,
            "Договор CTR-002",
            "owner@noreply.local");

        var message = SlaNotificationPolicy.BuildNotificationMessage(candidate);

        Assert.Equal("Предупреждение SLA: Договор CTR-002", message.Subject);
    }
}
