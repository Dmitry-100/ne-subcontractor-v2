using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureShortlistMutationPolicy
{
    public static IReadOnlyList<ProcedureShortlistAdjustmentLog> BuildAdjustmentLogs(
        Guid procedureId,
        IReadOnlyCollection<ProcedureShortlistItem> existingItems,
        IReadOnlyCollection<NormalizedShortlistItem> updatedItems,
        string? adjustmentReason)
    {
        if (existingItems.Count == 0)
        {
            return Array.Empty<ProcedureShortlistAdjustmentLog>();
        }

        var existingByContractor = existingItems.ToDictionary(x => x.ContractorId);
        var updatedByContractor = updatedItems.ToDictionary(x => x.ContractorId);
        var allContractorIds = existingByContractor.Keys
            .Union(updatedByContractor.Keys)
            .Distinct()
            .ToArray();

        var operationId = Guid.NewGuid();
        var reason = NormalizeOptionalText(adjustmentReason) ?? "Manual shortlist update";
        var logs = new List<ProcedureShortlistAdjustmentLog>(allContractorIds.Length);

        foreach (var contractorId in allContractorIds)
        {
            existingByContractor.TryGetValue(contractorId, out var previous);
            updatedByContractor.TryGetValue(contractorId, out var next);

            var previousExclusionReason = NormalizeOptionalText(previous?.ExclusionReason);
            var nextExclusionReason = NormalizeOptionalText(next?.ExclusionReason);

            var changed = previous is null ||
                          next is null ||
                          previous.IsIncluded != next.IsIncluded ||
                          previous.SortOrder != next.SortOrder ||
                          !string.Equals(previousExclusionReason, nextExclusionReason, StringComparison.Ordinal);

            if (!changed)
            {
                continue;
            }

            logs.Add(new ProcedureShortlistAdjustmentLog
            {
                OperationId = operationId,
                ProcedureId = procedureId,
                ContractorId = contractorId,
                PreviousIsIncluded = previous?.IsIncluded,
                NewIsIncluded = next?.IsIncluded ?? false,
                PreviousSortOrder = previous?.SortOrder,
                NewSortOrder = next?.SortOrder ?? previous?.SortOrder ?? 0,
                PreviousExclusionReason = previousExclusionReason,
                NewExclusionReason = next is null
                    ? "Removed from shortlist"
                    : nextExclusionReason,
                Reason = reason
            });
        }

        return logs;
    }

    public static NormalizedShortlistItem[] NormalizeItems(IReadOnlyCollection<UpsertProcedureShortlistItemRequest>? items)
    {
        var result = (items ?? Array.Empty<UpsertProcedureShortlistItemRequest>())
            .Select((item, index) =>
            {
                if (item.ContractorId == Guid.Empty)
                {
                    throw new ArgumentException($"Shortlist item #{index + 1}: contractorId is required.", nameof(item.ContractorId));
                }

                if (!item.IsIncluded && string.IsNullOrWhiteSpace(item.ExclusionReason))
                {
                    throw new ArgumentException(
                        $"Shortlist item #{index + 1}: exclusionReason is required when contractor is excluded.",
                        nameof(item.ExclusionReason));
                }

                if (item.SortOrder < 0)
                {
                    throw new ArgumentException($"Shortlist item #{index + 1}: sortOrder must be non-negative.", nameof(item.SortOrder));
                }

                return new NormalizedShortlistItem(
                    item.ContractorId,
                    item.IsIncluded,
                    item.SortOrder,
                    item.IsIncluded ? null : item.ExclusionReason?.Trim(),
                    NormalizeOptionalText(item.Notes));
            })
            .OrderBy(x => x.SortOrder)
            .ToArray();

        var duplicateContractor = result
            .GroupBy(x => x.ContractorId)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicateContractor is not null)
        {
            throw new ArgumentException($"Duplicate contractor '{duplicateContractor.Key}' in shortlist.");
        }

        return result;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

internal sealed record NormalizedShortlistItem(
    Guid ContractorId,
    bool IsIncluded,
    int SortOrder,
    string? ExclusionReason,
    string? Notes);
