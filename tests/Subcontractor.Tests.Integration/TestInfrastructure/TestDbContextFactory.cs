using Microsoft.EntityFrameworkCore;
using Subcontractor.Infrastructure.Persistence;

namespace Subcontractor.Tests.Integration.TestInfrastructure;

public static class TestDbContextFactory
{
    public static AppDbContext Create(string currentUserLogin = "integration-test-user")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"subcontractor-tests-{Guid.NewGuid():N}")
            .EnableDetailedErrors()
            .EnableSensitiveDataLogging()
            .Options;

        return new AppDbContext(options, new TestCurrentUserService(currentUserLogin));
    }
}
