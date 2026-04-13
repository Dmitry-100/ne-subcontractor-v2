using Subcontractor.Application.ReferenceData.Models;

namespace Subcontractor.Application.ReferenceData;

public static class ReferenceDataCodePolicy
{
    public static string NormalizeTypeCode(string typeCode)
    {
        if (string.IsNullOrWhiteSpace(typeCode))
        {
            throw new ArgumentException("Type code is required.", nameof(typeCode));
        }

        return typeCode.Trim().ToUpperInvariant();
    }

    public static string NormalizeItemCode(string itemCode)
    {
        if (string.IsNullOrWhiteSpace(itemCode))
        {
            throw new ArgumentException("Item code is required.", nameof(itemCode));
        }

        return itemCode.Trim().ToUpperInvariant();
    }

    public static string NormalizeDisplayName(UpsertReferenceDataItemRequest request)
    {
        if (request is null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            throw new ArgumentException("Display name is required.", nameof(request.DisplayName));
        }

        return request.DisplayName.Trim();
    }
}
