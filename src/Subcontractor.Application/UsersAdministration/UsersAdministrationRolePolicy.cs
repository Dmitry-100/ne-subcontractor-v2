using Subcontractor.Domain.Users;

namespace Subcontractor.Application.UsersAdministration;

public static class UsersAdministrationRolePolicy
{
    public static string[] NormalizeRoleNames(IReadOnlyCollection<string>? roleNames)
    {
        return (roleNames ?? Array.Empty<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public static void EnsureRequestedRolesKnown(
        IReadOnlyCollection<string> requestedRoleNames,
        IReadOnlyCollection<AppRole> knownRoles,
        string paramName)
    {
        if (knownRoles.Count == requestedRoleNames.Count)
        {
            return;
        }

        var knownRoleNames = knownRoles
            .Select(x => x.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var unknownRoles = requestedRoleNames
            .Where(x => !knownRoleNames.Contains(x))
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (unknownRoles.Length == 0)
        {
            return;
        }

        throw new ArgumentException(
            $"Unknown role names: {string.Join(", ", unknownRoles)}",
            paramName);
    }
}
