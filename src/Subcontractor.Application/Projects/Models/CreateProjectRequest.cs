using System.ComponentModel.DataAnnotations;

namespace Subcontractor.Application.Projects.Models;

public sealed class CreateProjectRequest
{
    [Required]
    [MaxLength(64)]
    public string Code { get; init; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Name { get; init; } = string.Empty;

    public Guid? GipUserId { get; init; }
}
