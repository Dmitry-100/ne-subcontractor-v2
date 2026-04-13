namespace Subcontractor.Application.Lots;

internal static class LotRecommendationPolicy
{
    public static string BuildGroupKey(string projectCode, string disciplineCode)
    {
        return $"{projectCode}|{disciplineCode}";
    }

    public static string BuildSuggestedLotCode(string projectCode, string disciplineCode, int index)
    {
        var project = NormalizeCodeToken(projectCode, 18);
        var discipline = NormalizeCodeToken(disciplineCode, 18);
        var seed = $"LOT-{project}-{discipline}-{index:00}";
        return seed.Length <= 64 ? seed : seed[..64];
    }

    public static string EnsureUniqueSuggestedCode(string candidate, ISet<string> usedCodes)
    {
        if (usedCodes.Add(candidate))
        {
            return candidate;
        }

        for (var suffix = 2; suffix < 1000; suffix++)
        {
            var prefixLimit = Math.Max(1, 64 - 4);
            var prefix = candidate.Length > prefixLimit ? candidate[..prefixLimit] : candidate;
            var next = $"{prefix}-{suffix:00}";
            if (next.Length > 64)
            {
                next = next[..64];
            }

            if (usedCodes.Add(next))
            {
                return next;
            }
        }

        throw new InvalidOperationException("Unable to build unique suggested lot code.");
    }

    public static string BuildSuggestedLotName(string projectCode, string disciplineCode, int itemsCount)
    {
        var name = $"{projectCode} / {disciplineCode} / {itemsCount} item(s)";
        return name.Length <= 512 ? name : name[..512];
    }

    public static string NormalizeLotCode(string? requestedCode, string fallbackCode)
    {
        var value = string.IsNullOrWhiteSpace(requestedCode) ? fallbackCode : requestedCode.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Lot code cannot be empty.", nameof(requestedCode));
        }

        if (value.Length > 64)
        {
            value = value[..64];
        }

        return value;
    }

    public static string NormalizeLotName(string? requestedName, string fallbackName)
    {
        var value = string.IsNullOrWhiteSpace(requestedName) ? fallbackName : requestedName.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Lot name cannot be empty.", nameof(requestedName));
        }

        return value.Length <= 512 ? value : value[..512];
    }

    private static string NormalizeCodeToken(string value, int limit)
    {
        var chars = value
            .Trim()
            .ToUpperInvariant()
            .Select(x => char.IsLetterOrDigit(x) ? x : '-')
            .ToArray();

        var normalized = new string(chars);
        while (normalized.Contains("--", StringComparison.Ordinal))
        {
            normalized = normalized.Replace("--", "-", StringComparison.Ordinal);
        }

        normalized = normalized.Trim('-');
        if (string.IsNullOrWhiteSpace(normalized))
        {
            normalized = "NA";
        }

        return normalized.Length <= limit ? normalized : normalized[..limit];
    }
}
