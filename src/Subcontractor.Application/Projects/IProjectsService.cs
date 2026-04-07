using Subcontractor.Application.Projects.Models;

namespace Subcontractor.Application.Projects;

public interface IProjectsService
{
    Task<IReadOnlyList<ProjectListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default);
    Task<ProjectDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProjectDetailsDto> CreateAsync(CreateProjectRequest request, CancellationToken cancellationToken = default);
    Task<ProjectDetailsDto?> UpdateAsync(Guid id, UpdateProjectRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

