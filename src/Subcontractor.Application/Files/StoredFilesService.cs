using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Files.Models;
using Subcontractor.Domain.Files;

namespace Subcontractor.Application.Files;

public sealed class StoredFilesService : IStoredFilesService
{
    public const string UnassignedOwnerEntityType = "UNASSIGNED";

    private readonly IApplicationDbContext _dbContext;

    public StoredFilesService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<StoredFileDto> CreateUnassignedAsync(
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new ArgumentException("File name is required.", nameof(fileName));
        }

        if (content is null || content.Length == 0)
        {
            throw new ArgumentException("File content is required.", nameof(content));
        }

        var entity = new StoredFile
        {
            FileName = Path.GetFileName(fileName.Trim()),
            ContentType = string.IsNullOrWhiteSpace(contentType)
                ? "application/octet-stream"
                : contentType.Trim(),
            FileSizeBytes = content.LongLength,
            Content = content,
            OwnerEntityType = UnassignedOwnerEntityType,
            OwnerEntityId = Guid.Empty
        };

        await _dbContext.Set<StoredFile>().AddAsync(entity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new StoredFileDto(
            entity.Id,
            entity.FileName,
            entity.ContentType,
            entity.FileSizeBytes,
            entity.OwnerEntityType,
            entity.OwnerEntityId);
    }
}
