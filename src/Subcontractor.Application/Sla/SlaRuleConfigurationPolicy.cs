using Subcontractor.Application.Sla.Models;

namespace Subcontractor.Application.Sla;

internal static class SlaRuleConfigurationPolicy
{
    internal static IReadOnlyList<NormalizedSlaRuleItem> NormalizeRuleItems(IReadOnlyList<UpsertSlaRuleItemRequest> items)
    {
        if (items.Count == 0)
        {
            return Array.Empty<NormalizedSlaRuleItem>();
        }

        var normalized = new List<NormalizedSlaRuleItem>(items.Count);
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in items)
        {
            var code = NormalizeCode(item.PurchaseTypeCode);
            if (string.IsNullOrWhiteSpace(code))
            {
                throw new ArgumentException("PurchaseTypeCode is required.", nameof(items));
            }

            if (!seenCodes.Add(code))
            {
                throw new ArgumentException($"Duplicate PurchaseTypeCode '{code}' in SLA rules request.", nameof(items));
            }

            var warningDays = NormalizeWarningDays(item.WarningDaysBeforeDue);
            normalized.Add(new NormalizedSlaRuleItem(
                code,
                warningDays,
                item.IsActive,
                NormalizeNullableText(item.Description)));
        }

        return normalized;
    }

    internal static int ResolveWarningDays(
        string purchaseTypeCode,
        IReadOnlyDictionary<string, int> warningDaysByPurchaseType,
        int defaultWarningDaysBeforeDue)
    {
        var key = NormalizeCode(purchaseTypeCode);
        if (!string.IsNullOrWhiteSpace(key) && warningDaysByPurchaseType.TryGetValue(key, out var value))
        {
            return NormalizeWarningDays(value);
        }

        return NormalizeWarningDays(defaultWarningDaysBeforeDue);
    }

    internal static int NormalizeWarningDays(int warningDays)
    {
        return warningDays switch
        {
            < 0 => throw new ArgumentException("WarningDaysBeforeDue cannot be negative."),
            > 30 => throw new ArgumentException("WarningDaysBeforeDue cannot be greater than 30."),
            _ => warningDays
        };
    }

    internal static string NormalizeCode(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    internal static string? NormalizeNullableCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant();
    }

    internal static string? NormalizeNullableText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}

internal sealed record NormalizedSlaRuleItem(
    string PurchaseTypeCode,
    int WarningDaysBeforeDue,
    bool IsActive,
    string? Description);
