using Subcontractor.Application.Sla;
using Subcontractor.Domain.Sla;

namespace Subcontractor.Tests.Unit.Sla;

public sealed class SlaReadProjectionPolicyTests
{
    [Fact]
    public void MapRule_ShouldMapAllFields()
    {
        var rule = new SlaRule
        {
            PurchaseTypeCode = "EP",
            WarningDaysBeforeDue = 3,
            IsActive = true,
            Description = "desc"
        };

        var dto = SlaReadProjectionPolicy.MapRule(rule);

        Assert.Equal(rule.Id, dto.Id);
        Assert.Equal("EP", dto.PurchaseTypeCode);
        Assert.Equal(3, dto.WarningDaysBeforeDue);
        Assert.True(dto.IsActive);
        Assert.Equal("desc", dto.Description);
    }

    [Fact]
    public void MapViolation_ShouldMapAllFields()
    {
        var violation = new SlaViolation
        {
            EntityType = SlaViolationEntityType.ContractEndDate,
            EntityId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            DueDate = new DateTime(2026, 4, 10),
            Severity = SlaViolationSeverity.Warning,
            Title = "title",
            RecipientEmail = "user@example.com",
            IsResolved = false,
            FirstDetectedAtUtc = new DateTime(2026, 4, 9, 10, 0, 0),
            LastDetectedAtUtc = new DateTime(2026, 4, 10, 10, 0, 0),
            NotificationAttempts = 2,
            LastNotificationError = "smtp error",
            ReasonCode = "NO_OWNER",
            ReasonComment = "comment"
        };

        var dto = SlaReadProjectionPolicy.MapViolation(violation);

        Assert.Equal(violation.Id, dto.Id);
        Assert.Equal("ContractEndDate", dto.EntityType);
        Assert.Equal(violation.EntityId, dto.EntityId);
        Assert.Equal("Warning", dto.Severity);
        Assert.Equal("title", dto.Title);
        Assert.Equal("user@example.com", dto.RecipientEmail);
        Assert.Equal(2, dto.NotificationAttempts);
        Assert.Equal("smtp error", dto.LastNotificationError);
        Assert.Equal("NO_OWNER", dto.ReasonCode);
        Assert.Equal("comment", dto.ReasonComment);
    }
}
