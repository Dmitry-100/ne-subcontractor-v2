using Subcontractor.Application.Contracts;
using Subcontractor.Domain.Contracts;

namespace Subcontractor.Tests.Unit.Contracts;

public sealed class ContractTransitionPolicyTests
{
    [Fact]
    public void EnsureTransitionAllowed_ShouldPass_ForForwardStep()
    {
        var action = () => ContractTransitionPolicy.EnsureTransitionAllowed(
            ContractStatus.Draft,
            ContractStatus.OnApproval,
            reason: null);

        Assert.Null(Record.Exception(action));
    }

    [Fact]
    public void EnsureTransitionAllowed_ShouldRequireReason_ForRollbackStep()
    {
        var error = Assert.Throws<ArgumentException>(() => ContractTransitionPolicy.EnsureTransitionAllowed(
            ContractStatus.Active,
            ContractStatus.Signed,
            reason: null));

        Assert.Equal("reason", error.ParamName);
    }

    [Fact]
    public void EnsureTransitionAllowed_ShouldThrow_ForSkipTransition()
    {
        var error = Assert.Throws<InvalidOperationException>(() => ContractTransitionPolicy.EnsureTransitionAllowed(
            ContractStatus.Draft,
            ContractStatus.Signed,
            reason: null));

        Assert.Equal("Transition Draft -> Signed is not allowed.", error.Message);
    }

    [Fact]
    public void EnsureTransitionStateData_ShouldThrow_WhenSigningDateMissing_ForSignedTarget()
    {
        var contract = new Contract
        {
            Status = ContractStatus.OnApproval,
            SigningDate = null
        };

        var error = Assert.Throws<InvalidOperationException>(() => ContractTransitionPolicy.EnsureTransitionStateData(
            contract,
            ContractStatus.Signed));

        Assert.Equal("SigningDate is required before transition to Signed.", error.Message);
    }

    [Fact]
    public void EnsureTransitionStateData_ShouldThrow_WhenClosedTargetWithoutEndDate()
    {
        var contract = new Contract
        {
            Status = ContractStatus.Active,
            SigningDate = new DateTime(2026, 4, 1),
            StartDate = new DateTime(2026, 4, 2),
            EndDate = null
        };

        var error = Assert.Throws<InvalidOperationException>(() => ContractTransitionPolicy.EnsureTransitionStateData(
            contract,
            ContractStatus.Closed));

        Assert.Equal("EndDate is required before transition to Closed.", error.Message);
    }

    [Fact]
    public void EnsureTransitionStateData_ShouldPass_WhenRequiredDatesPresent()
    {
        var contract = new Contract
        {
            Status = ContractStatus.Active,
            SigningDate = new DateTime(2026, 4, 1),
            StartDate = new DateTime(2026, 4, 2),
            EndDate = new DateTime(2026, 5, 2)
        };

        var action = () => ContractTransitionPolicy.EnsureTransitionStateData(contract, ContractStatus.Closed);

        Assert.Null(Record.Exception(action));
    }
}
