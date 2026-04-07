using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Projects;

public sealed class Project : SoftDeletableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? GipUserId { get; set; }
}

