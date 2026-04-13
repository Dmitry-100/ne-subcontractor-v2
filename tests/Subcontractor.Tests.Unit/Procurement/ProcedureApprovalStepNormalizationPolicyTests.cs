using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureApprovalStepNormalizationPolicyTests
{
    [Fact]
    public void Normalize_WithValidUnorderedSteps_ShouldReturnOrderedAndTrimmedValues()
    {
        var result = ProcedureApprovalStepNormalizationPolicy.Normalize(
        [
            new ConfigureProcedureApprovalStepRequest
            {
                StepOrder = 20,
                StepTitle = "  Финансист  ",
                ApproverRoleName = "  Финконтроль ",
                IsRequired = true
            },
            new ConfigureProcedureApprovalStepRequest
            {
                StepOrder = 10,
                StepTitle = "  Коммерческий директор ",
                ApproverUserId = Guid.NewGuid(),
                IsRequired = true
            }
        ]);

        Assert.Equal(2, result.Length);
        Assert.Equal(10, result[0].StepOrder);
        Assert.Equal("Коммерческий директор", result[0].StepTitle);
        Assert.Equal(20, result[1].StepOrder);
        Assert.Equal("Финконтроль", result[1].ApproverRoleName);
    }

    [Fact]
    public void Normalize_WithDuplicateStepOrder_ShouldThrowArgumentException()
    {
        var error = Assert.Throws<ArgumentException>(() => ProcedureApprovalStepNormalizationPolicy.Normalize(
        [
            new ConfigureProcedureApprovalStepRequest
            {
                StepOrder = 1,
                StepTitle = "A",
                ApproverUserId = Guid.NewGuid()
            },
            new ConfigureProcedureApprovalStepRequest
            {
                StepOrder = 1,
                StepTitle = "B",
                ApproverRoleName = "ROLE_B"
            }
        ]));

        Assert.Contains("Duplicate stepOrder", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Normalize_WithoutApproverUserAndRole_ShouldThrowArgumentException()
    {
        var error = Assert.Throws<ArgumentException>(() => ProcedureApprovalStepNormalizationPolicy.Normalize(
        [
            new ConfigureProcedureApprovalStepRequest
            {
                StepOrder = 1,
                StepTitle = "Согласование",
                ApproverUserId = null,
                ApproverRoleName = "   "
            }
        ]));

        Assert.Contains("either approverUserId or approverRoleName", error.Message, StringComparison.OrdinalIgnoreCase);
    }
}
