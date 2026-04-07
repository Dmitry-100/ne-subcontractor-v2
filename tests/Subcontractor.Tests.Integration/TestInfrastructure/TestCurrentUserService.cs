using Subcontractor.Application.Abstractions;

namespace Subcontractor.Tests.Integration.TestInfrastructure;

public sealed class TestCurrentUserService : ICurrentUserService
{
    public TestCurrentUserService(string userLogin)
    {
        UserLogin = userLogin;
    }

    public string UserLogin { get; }
}
