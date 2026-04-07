using Microsoft.AspNetCore.Http;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Security;

namespace Subcontractor.Infrastructure.Services;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string UserLogin
    {
        get
        {
            var login = _httpContextAccessor.HttpContext?.User?.Identity?.Name;
            var normalized = LoginNormalizer.Normalize(login);
            return string.IsNullOrWhiteSpace(normalized) ? "system" : normalized;
        }
    }
}
