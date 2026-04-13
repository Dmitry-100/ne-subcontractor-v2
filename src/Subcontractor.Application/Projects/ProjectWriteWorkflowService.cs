using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Projects;

namespace Subcontractor.Application.Projects;

public sealed class ProjectWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ProjectScopeResolverService _scopeResolverService;

    public ProjectWriteWorkflowService(
        IApplicationDbContext dbContext,
        ProjectScopeResolverService scopeResolverService)
    {
        _dbContext = dbContext;
        _scopeResolverService = scopeResolverService;
    }

    public async Task<ProjectDetailsDto> CreateAsync(
        CreateProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        ProjectRequestPolicy.EnsureCreateRequestValid(request);
        var normalizedCode = ProjectRequestPolicy.NormalizeCode(request.Code);
        var normalizedName = ProjectRequestPolicy.NormalizeName(request.Name);

        var exists = await _dbContext.Projects.AnyAsync(x => x.Code == normalizedCode, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Project with code '{normalizedCode}' already exists.");
        }

        var entity = new Project
        {
            Code = normalizedCode,
            Name = normalizedName,
            GipUserId = request.GipUserId
        };

        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);
        if (scope is { HasGlobalRead: false })
        {
            entity.GipUserId = scope.AppUserId;
        }

        await _dbContext.Set<Project>().AddAsync(entity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ProjectDetailsDto(entity.Id, entity.Code, entity.Name, entity.GipUserId);
    }

    public async Task<ProjectDetailsDto?> UpdateAsync(
        Guid id,
        UpdateProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        ProjectRequestPolicy.EnsureUpdateRequestValid(request);
        var normalizedName = ProjectRequestPolicy.NormalizeName(request.Name);

        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);
        var entity = await ProjectReadScopePolicy.ApplyReadScope(_dbContext.Set<Project>(), scope)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        entity.Name = normalizedName;
        if (scope is { HasGlobalRead: false })
        {
            entity.GipUserId = scope.AppUserId;
        }
        else
        {
            entity.GipUserId = request.GipUserId;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new ProjectDetailsDto(entity.Id, entity.Code, entity.Name, entity.GipUserId);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var scope = await _scopeResolverService.ResolveScopeAsync(cancellationToken);
        var entity = await ProjectReadScopePolicy.ApplyReadScope(_dbContext.Set<Project>(), scope)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return false;
        }

        _dbContext.Set<Project>().Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
