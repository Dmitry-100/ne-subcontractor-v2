using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Projects.Models;

namespace Subcontractor.Application.Projects;

public sealed class ProjectsService : IProjectsService
{
    private readonly ProjectReadQueryService _readQueryService;
    private readonly ProjectWriteWorkflowService _writeWorkflowService;

    public ProjectsService(IApplicationDbContext dbContext, ICurrentUserService currentUserService)
    {
        var scopeResolver = new ProjectScopeResolverService(dbContext, currentUserService);
        _readQueryService = new ProjectReadQueryService(dbContext, scopeResolver);
        _writeWorkflowService = new ProjectWriteWorkflowService(dbContext, scopeResolver);
    }

    internal ProjectsService(
        ProjectReadQueryService readQueryService,
        ProjectWriteWorkflowService writeWorkflowService)
    {
        _readQueryService = readQueryService;
        _writeWorkflowService = writeWorkflowService;
    }

    public async Task<IReadOnlyList<ProjectListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListAsync(search, cancellationToken);
    }

    public async Task<ProjectListPageDto> ListPageAsync(
        string? search,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListPageAsync(search, skip, take, cancellationToken);
    }

    public async Task<ProjectDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetByIdAsync(id, cancellationToken);
    }

    public async Task<ProjectDetailsDto> CreateAsync(CreateProjectRequest request, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.CreateAsync(request, cancellationToken);
    }

    public async Task<ProjectDetailsDto?> UpdateAsync(Guid id, UpdateProjectRequest request, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.UpdateAsync(id, request, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.DeleteAsync(id, cancellationToken);
    }
}
