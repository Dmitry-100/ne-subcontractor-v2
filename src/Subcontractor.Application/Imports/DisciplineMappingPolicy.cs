using System.Security.Cryptography;
using System.Text;
using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

public static class DisciplineMappingPolicy
{
    public static NormalizedDisciplineMappingItem[] NormalizeItems(
        IReadOnlyCollection<UpsertDisciplineMappingItemRequest>? items)
    {
        return (items ?? Array.Empty<UpsertDisciplineMappingItemRequest>())
            .Select(NormalizeItem)
            .Where(x => !string.IsNullOrWhiteSpace(x.ProjectDisciplineName) &&
                        !string.IsNullOrWhiteSpace(x.ResourceDisciplineName))
            .GroupBy(x => x.MappingKey, StringComparer.OrdinalIgnoreCase)
            .Select(x => x.Last())
            .ToArray();
    }

    public static string BuildMappingKey(string resourceDisciplineName, string projectDisciplineName)
    {
        var keySource = $"{NormalizeLookupKey(resourceDisciplineName)}|{NormalizeLookupKey(projectDisciplineName)}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(keySource)));
    }

    public static ProjectDisciplineResolution ResolveProjectDiscipline(
        string? currentProjectDiscipline,
        string? resourceDisciplineName,
        IReadOnlyDictionary<string, IReadOnlyList<string>> mappingsByResource)
    {
        var normalizedCurrent = NormalizeDisplayText(currentProjectDiscipline);
        var normalizedResource = NormalizeDisplayText(resourceDisciplineName);
        if (string.IsNullOrWhiteSpace(normalizedResource))
        {
            return new ProjectDisciplineResolution(normalizedCurrent, null);
        }

        if (!mappingsByResource.TryGetValue(normalizedResource, out var mappedDisciplines) ||
            mappedDisciplines.Count == 0)
        {
            return string.IsNullOrWhiteSpace(normalizedCurrent)
                ? new ProjectDisciplineResolution(
                    normalizedCurrent,
                    $"Для дисциплины-ресурса '{normalizedResource}' не найдено соответствие проектной дисциплине.")
                : new ProjectDisciplineResolution(normalizedCurrent, null);
        }

        if (!string.IsNullOrWhiteSpace(normalizedCurrent))
        {
            var exists = mappedDisciplines.Any(x =>
                string.Equals(NormalizeLookupKey(x), NormalizeLookupKey(normalizedCurrent), StringComparison.OrdinalIgnoreCase));
            return exists
                ? new ProjectDisciplineResolution(normalizedCurrent, null)
                : new ProjectDisciplineResolution(
                    normalizedCurrent,
                    $"Проектная дисциплина '{normalizedCurrent}' не входит в список допустимых для дисциплины-ресурса '{normalizedResource}'.");
        }

        if (mappedDisciplines.Count == 1)
        {
            return new ProjectDisciplineResolution(mappedDisciplines[0], null);
        }

        return new ProjectDisciplineResolution(
            string.Empty,
            $"Для дисциплины-ресурса '{normalizedResource}' найдено несколько вариантов: выберите проектную дисциплину.");
    }

    public static string NormalizeDisplayText(string? value)
    {
        return string.Join(
            ' ',
            (value ?? string.Empty)
                .Trim()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    internal static string NormalizeLookupKey(string? value)
    {
        return NormalizeDisplayText(value).ToUpperInvariant();
    }

    private static NormalizedDisciplineMappingItem NormalizeItem(UpsertDisciplineMappingItemRequest request)
    {
        var resourceDisciplineName = NormalizeDisplayText(request.ResourceDisciplineName);
        var projectDisciplineName = NormalizeDisplayText(request.ProjectDisciplineName);
        return new NormalizedDisciplineMappingItem(
            BuildMappingKey(resourceDisciplineName, projectDisciplineName),
            NormalizeDisplayText(request.ProjectDisciplineGroup),
            NormalizeDisplayText(request.ProjectDisciplineSection),
            projectDisciplineName,
            resourceDisciplineName);
    }
}

public sealed record NormalizedDisciplineMappingItem(
    string MappingKey,
    string ProjectDisciplineGroup,
    string ProjectDisciplineSection,
    string ProjectDisciplineName,
    string ResourceDisciplineName);

public sealed record ProjectDisciplineResolution(
    string ProjectDisciplineName,
    string? ErrorMessage);
