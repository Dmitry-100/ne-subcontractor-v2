using Subcontractor.Application.Abstractions;

namespace Subcontractor.Tests.SqlServer.TestInfrastructure;

internal sealed class SqlTestCurrentUserService : ICurrentUserService
{
    public SqlTestCurrentUserService(string userLogin)
    {
        UserLogin = userLogin;
    }

    public string UserLogin { get; }
}
