using Subcontractor.Application.Lots.Models;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Lots;

internal static class LotMutationPolicy
{
    public static string NormalizeCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Lot code is required.", nameof(code));
        }

        return code.Trim();
    }

    public static string NormalizeName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Lot name is required.", nameof(name));
        }

        return name.Trim();
    }

    public static NormalizedLotItem[] NormalizeItems(IReadOnlyCollection<UpsertLotItemRequest>? items)
    {
        return (items ?? Array.Empty<UpsertLotItemRequest>())
            .Select((item, index) => NormalizeItem(item, index))
            .ToArray();
    }

    public static LotItem ToEntity(NormalizedLotItem item)
    {
        return new LotItem
        {
            ProjectId = item.ProjectId,
            ObjectWbs = item.ObjectWbs,
            DisciplineCode = item.DisciplineCode,
            ManHours = item.ManHours,
            PlannedStartDate = item.PlannedStartDate,
            PlannedFinishDate = item.PlannedFinishDate
        };
    }

    private static NormalizedLotItem NormalizeItem(UpsertLotItemRequest item, int index)
    {
        if (item.ProjectId == Guid.Empty)
        {
            throw new ArgumentException($"Item #{index + 1}: projectId is required.", nameof(item.ProjectId));
        }

        if (string.IsNullOrWhiteSpace(item.ObjectWbs))
        {
            throw new ArgumentException($"Item #{index + 1}: objectWbs is required.", nameof(item.ObjectWbs));
        }

        if (string.IsNullOrWhiteSpace(item.DisciplineCode))
        {
            throw new ArgumentException($"Item #{index + 1}: disciplineCode is required.", nameof(item.DisciplineCode));
        }

        if (item.ManHours < 0)
        {
            throw new ArgumentException($"Item #{index + 1}: manHours must be non-negative.", nameof(item.ManHours));
        }

        if (item.PlannedStartDate.HasValue &&
            item.PlannedFinishDate.HasValue &&
            item.PlannedStartDate.Value.Date > item.PlannedFinishDate.Value.Date)
        {
            throw new ArgumentException(
                $"Item #{index + 1}: plannedStartDate must be <= plannedFinishDate.",
                nameof(item.PlannedStartDate));
        }

        return new NormalizedLotItem(
            item.ProjectId,
            item.ObjectWbs.Trim(),
            item.DisciplineCode.Trim().ToUpperInvariant(),
            item.ManHours,
            item.PlannedStartDate,
            item.PlannedFinishDate);
    }

    internal sealed record NormalizedLotItem(
        Guid ProjectId,
        string ObjectWbs,
        string DisciplineCode,
        decimal ManHours,
        DateTime? PlannedStartDate,
        DateTime? PlannedFinishDate);
}
