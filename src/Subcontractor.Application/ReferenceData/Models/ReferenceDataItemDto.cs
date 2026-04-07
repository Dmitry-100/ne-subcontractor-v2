namespace Subcontractor.Application.ReferenceData.Models;

public sealed record ReferenceDataItemDto(
    string TypeCode,
    string ItemCode,
    string DisplayName,
    int SortOrder,
    bool IsActive
);

