using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Tests.Unit.Procurement;

public sealed class ProcedureTransitionPolicyTests
{
    [Fact]
    public void EnsureTransitionAllowed_ForwardTransitionWithoutReason_ShouldNotThrow()
    {
        var error = Record.Exception(() => ProcedureTransitionPolicy.EnsureTransitionAllowed(
            ProcurementProcedureStatus.Created,
            ProcurementProcedureStatus.DocumentsPreparation,
            reason: null));

        Assert.Null(error);
    }

    [Fact]
    public void EnsureTransitionAllowed_RollbackWithoutReason_ShouldThrowArgumentException()
    {
        var error = Assert.Throws<ArgumentException>(() => ProcedureTransitionPolicy.EnsureTransitionAllowed(
            ProcurementProcedureStatus.Sent,
            ProcurementProcedureStatus.OnApproval,
            reason: null));

        Assert.Contains("Reason is required", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnsureTransitionAllowed_UnsupportedTransition_ShouldThrowInvalidOperationException()
    {
        var error = Assert.Throws<InvalidOperationException>(() => ProcedureTransitionPolicy.EnsureTransitionAllowed(
            ProcurementProcedureStatus.Created,
            ProcurementProcedureStatus.Completed,
            reason: "manual override"));

        Assert.Contains("is not allowed", error.Message, StringComparison.OrdinalIgnoreCase);
    }
}
