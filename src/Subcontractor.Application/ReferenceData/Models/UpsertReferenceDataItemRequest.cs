using System.ComponentModel.DataAnnotations;

namespace Subcontractor.Application.ReferenceData.Models;

public sealed class UpsertReferenceDataItemRequest
{
    [Required]
    [MaxLength(128)]
    public string ItemCode { get; init; } = string.Empty;

    [Required]
    [MaxLength(512)]
    public string DisplayName { get; init; } = string.Empty;

    public int SortOrder { get; init; }
    public bool IsActive { get; init; } = true;
}

