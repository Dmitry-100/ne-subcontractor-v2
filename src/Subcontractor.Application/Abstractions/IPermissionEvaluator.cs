namespace Subcontractor.Application.Abstractions;

public interface IPermissionEvaluator
{
    Task<bool> HasPermissionAsync(string login, string permissionCode, CancellationToken cancellationToken = default);
}

