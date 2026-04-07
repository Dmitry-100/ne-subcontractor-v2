using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.ReferenceData;

public sealed class ReferenceDataEntry : SoftDeletableEntity
{
    public string TypeCode { get; set; } = string.Empty;
    public string ItemCode { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

