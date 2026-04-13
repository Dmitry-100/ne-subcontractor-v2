using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

internal static class LotTransitionPolicy
{
    public static void EnsureTransitionAllowed(LotStatus current, LotStatus target, string? reason)
    {
        if ((int)target > (int)current)
        {
            if ((int)target - (int)current != 1)
            {
                throw new InvalidOperationException($"Forward transition {current} -> {target} is not allowed.");
            }

            return;
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("Rollback reason is required.", nameof(reason));
        }
    }
}
