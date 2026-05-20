using Subcontractor.Application.Files.Models;

namespace Subcontractor.Application.Files;

public interface IStoredFilesService
{
    Task<StoredFileDto> CreateUnassignedAsync(
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken cancellationToken = default);
}
