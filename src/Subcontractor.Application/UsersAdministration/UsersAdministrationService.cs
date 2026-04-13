using Subcontractor.Application.Abstractions;
using Subcontractor.Application.UsersAdministration.Models;

namespace Subcontractor.Application.UsersAdministration;

public sealed class UsersAdministrationService : IUsersAdministrationService
{
    private readonly UsersAdministrationReadQueryService _readQueryService;
    private readonly UsersAdministrationWriteWorkflowService _writeWorkflowService;

    public UsersAdministrationService(IApplicationDbContext dbContext)
        : this(
            new UsersAdministrationReadQueryService(dbContext),
            new UsersAdministrationWriteWorkflowService(dbContext))
    {
    }

    internal UsersAdministrationService(
        UsersAdministrationReadQueryService readQueryService,
        UsersAdministrationWriteWorkflowService writeWorkflowService)
    {
        _readQueryService = readQueryService;
        _writeWorkflowService = writeWorkflowService;
    }

    public async Task<IReadOnlyList<UserListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListAsync(search, cancellationToken);
    }

    public async Task<UserDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _readQueryService.GetByIdAsync(id, cancellationToken);
    }

    public async Task<UserDetailsDto?> UpdateRolesAsync(
        Guid id,
        UpdateUserRolesRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _writeWorkflowService.UpdateRolesAsync(id, request, cancellationToken);
    }

    public async Task<IReadOnlyList<RoleLookupItemDto>> ListRolesAsync(CancellationToken cancellationToken = default)
    {
        return await _readQueryService.ListRolesAsync(cancellationToken);
    }
}
