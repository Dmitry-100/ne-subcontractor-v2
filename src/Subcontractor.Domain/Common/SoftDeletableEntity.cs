namespace Subcontractor.Domain.Common;

public abstract class SoftDeletableEntity : AuditableEntity
{
    public bool IsDeleted { get; private set; }
    public DateTimeOffset? DeletedAtUtc { get; private set; }
    public string? DeletedBy { get; private set; }

    public void MarkDeleted(string deletedBy, DateTimeOffset deletedAtUtc)
    {
        IsDeleted = true;
        DeletedBy = deletedBy;
        DeletedAtUtc = deletedAtUtc;
    }
}

