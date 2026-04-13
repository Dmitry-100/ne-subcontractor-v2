using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.ProcurementProcedures;

internal static class ProcedureOfferNormalizationPolicy
{
    public static ProcedureOfferDraft[] Normalize(IReadOnlyCollection<UpsertProcedureOfferItemRequest>? items)
    {
        var result = (items ?? Array.Empty<UpsertProcedureOfferItemRequest>())
            .Select((item, index) =>
            {
                if (item.ContractorId == Guid.Empty)
                {
                    throw new ArgumentException($"Offer item #{index + 1}: contractorId is required.", nameof(item.ContractorId));
                }

                if (string.IsNullOrWhiteSpace(item.OfferNumber))
                {
                    throw new ArgumentException($"Offer item #{index + 1}: offerNumber is required.", nameof(item.OfferNumber));
                }

                if (item.AmountWithoutVat < 0 || item.VatAmount < 0 || item.TotalAmount < 0)
                {
                    throw new ArgumentException(
                        $"Offer item #{index + 1}: amountWithoutVat, vatAmount and totalAmount must be non-negative.");
                }

                var expectedTotal = item.AmountWithoutVat + item.VatAmount;
                if (Math.Abs(expectedTotal - item.TotalAmount) > 0.01m)
                {
                    throw new ArgumentException(
                        $"Offer item #{index + 1}: totalAmount must equal amountWithoutVat + vatAmount.");
                }

                if (item.DurationDays.HasValue && item.DurationDays.Value < 0)
                {
                    throw new ArgumentException($"Offer item #{index + 1}: durationDays must be non-negative.", nameof(item.DurationDays));
                }

                if (string.IsNullOrWhiteSpace(item.CurrencyCode))
                {
                    throw new ArgumentException($"Offer item #{index + 1}: currencyCode is required.", nameof(item.CurrencyCode));
                }

                return new ProcedureOfferDraft(
                    item.ContractorId,
                    item.OfferNumber.Trim(),
                    item.ReceivedDate,
                    item.AmountWithoutVat,
                    item.VatAmount,
                    item.TotalAmount,
                    item.DurationDays,
                    item.CurrencyCode.Trim().ToUpperInvariant(),
                    item.QualificationStatus,
                    item.DecisionStatus,
                    NormalizeOptionalGuid(item.OfferFileId),
                    NormalizeOptionalText(item.Notes));
            })
            .OrderBy(x => x.TotalAmount)
            .ToArray();

        var duplicateContractor = result
            .GroupBy(x => x.ContractorId)
            .FirstOrDefault(g => g.Count() > 1);
        if (duplicateContractor is not null)
        {
            throw new ArgumentException($"Duplicate contractor '{duplicateContractor.Key}' in offers.");
        }

        return result;
    }

    private static Guid? NormalizeOptionalGuid(Guid? value)
    {
        return value.HasValue && value.Value != Guid.Empty ? value : null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

internal readonly record struct ProcedureOfferDraft(
    Guid ContractorId,
    string OfferNumber,
    DateTime? ReceivedDate,
    decimal AmountWithoutVat,
    decimal VatAmount,
    decimal TotalAmount,
    int? DurationDays,
    string CurrencyCode,
    ProcedureOfferQualificationStatus QualificationStatus,
    ProcedureOfferDecisionStatus DecisionStatus,
    Guid? OfferFileId,
    string? Notes);
