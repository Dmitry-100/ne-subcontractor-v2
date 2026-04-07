using Subcontractor.Domain.Common;

namespace Subcontractor.Domain.Files;

public sealed class StoredFile : SoftDeletableEntity
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public byte[] Content { get; set; } = Array.Empty<byte>();

    public string OwnerEntityType { get; set; } = string.Empty;
    public Guid OwnerEntityId { get; set; }
}

