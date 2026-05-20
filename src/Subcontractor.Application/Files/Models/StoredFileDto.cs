namespace Subcontractor.Application.Files.Models;

public sealed record StoredFileDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string OwnerEntityType,
    Guid OwnerEntityId);
