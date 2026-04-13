using Subcontractor.Domain.Contracts;

namespace Subcontractor.Application.Contracts;

internal static class ContractTransitionPolicy
{
    public static void EnsureTransitionAllowed(
        ContractStatus current,
        ContractStatus target,
        string? reason)
    {
        var delta = (int)target - (int)current;
        if (delta == 1)
        {
            return;
        }

        if (delta == -1)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ArgumentException("Rollback reason is required.", nameof(reason));
            }

            return;
        }

        throw new InvalidOperationException($"Transition {current} -> {target} is not allowed.");
    }

    public static void EnsureTransitionStateData(Contract contract, ContractStatus targetStatus)
    {
        if (targetStatus >= ContractStatus.Signed && !contract.SigningDate.HasValue)
        {
            throw new InvalidOperationException("SigningDate is required before transition to Signed.");
        }

        if (targetStatus >= ContractStatus.Active && !contract.StartDate.HasValue)
        {
            throw new InvalidOperationException("StartDate is required before transition to Active.");
        }

        if (targetStatus != ContractStatus.Closed)
        {
            return;
        }

        if (!contract.EndDate.HasValue)
        {
            throw new InvalidOperationException("EndDate is required before transition to Closed.");
        }

        if (contract.StartDate.HasValue && contract.EndDate.Value.Date < contract.StartDate.Value.Date)
        {
            throw new InvalidOperationException("EndDate must be greater or equal than StartDate.");
        }
    }
}
